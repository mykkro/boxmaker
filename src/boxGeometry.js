import * as THREE from 'three'
import { primitives, booleans, geometries as jscadGeoms } from '@jscad/modeling'

const { cuboid } = primitives
const { union, subtract } = booleans
const { geom3, poly3 } = jscadGeoms

// Convert a JSCAD solid (Z-up) to a Three.js BufferGeometry (Y-up).
// Mapping: JSCAD (x, y, z) → Three.js (x, z, y).
// Swapping two axes is a reflection, which reverses winding — so we flip the
// triangle fan order to keep CCW front faces in Three.js.
function solidToThree(solid) {
  const polygons = geom3.toPolygons(solid)
  const pos = [], nor = []
  for (const poly of polygons) {
    const pl = poly3.plane(poly)   // [nx, ny, nz, d]
    const vs = poly.vertices       // [[x,y,z], ...]
    const nx = pl[0], ny = pl[2], nz = pl[1]   // normal: Z-up → Y-up
    for (let i = 1; i < vs.length - 1; i++) {
      const p = v => pos.push(v[0], v[2], v[1]) // position: Z-up → Y-up
      p(vs[0]); p(vs[i + 1]); p(vs[i])          // reversed fan for winding
      nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  return geo
}

// Pure data helper — used by unit tests to verify the wall rectangle footprint.
export function wallRects(cells, walls, params) {
  const { cellSize, wallThickness, outerWallThickness: owt } = params
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const totalW = cols * cellSize + 2 * owt
  const totalD = rows * cellSize + 2 * owt

  const rects = [
    [0,            0,           owt,        totalD],
    [totalW - owt, 0,           totalW,     totalD],
    [0,            0,           totalW,     owt],
    [0,            totalD - owt, totalW,    totalD],
  ]

  for (const key of walls) {
    if (key.startsWith('h:')) {
      const [, r, c] = key.split(':').map(Number)
      if (r > 0 && r < rows && cells[r - 1][c] === false && cells[r][c] === false) {
        const x1 = owt + c * cellSize, x2 = owt + (c + 1) * cellSize
        const yc = owt + r * cellSize
        rects.push([x1, yc - wallThickness / 2, x2, yc + wallThickness / 2])
      }
    } else if (key.startsWith('v:')) {
      const [, r, c] = key.split(':').map(Number)
      if (c > 0 && c < cols && cells[r][c - 1] === false && cells[r][c] === false) {
        const xc = owt + c * cellSize
        const y1 = owt + r * cellSize, y2 = owt + (r + 1) * cellSize
        rects.push([xc - wallThickness / 2, y1, xc + wallThickness / 2, y2])
      }
    }
  }
  return rects
}

export function buildGeometry(cells, walls, params) {
  const { cellSize, boxHeight, wallThickness: wt, bottomThickness, outerWallThickness: owt } = params
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  if (rows === 0 || cols === 0) return new THREE.BufferGeometry()

  const totalW = cols * cellSize + 2 * owt
  const totalD = rows * cellSize + 2 * owt
  const innerH = Math.max(0, boxHeight - bottomThickness)

  // Box frame: outer solid minus inner cavity — single subtract gives a
  // continuous solid, so all outer and inner corners are seam-free.
  const outerBox = cuboid({
    size: [totalW, totalD, boxHeight],
    center: [totalW / 2, totalD / 2, boxHeight / 2],
  })

  let model
  if (innerH <= 0 || totalW <= 2 * owt || totalD <= 2 * owt) {
    model = outerBox
  } else {
    model = subtract(outerBox, cuboid({
      size: [totalW - 2 * owt, totalD - 2 * owt, innerH],
      center: [totalW / 2, totalD / 2, bottomThickness + innerH / 2],
    }))
  }

  const fills = []
  // Track every grid vertex (vC, vR) touched by any wall segment so we can
  // add a wt×wt pillar there.  This fills the "missing quarter" that appears
  // at L/T junctions where two wall cuboids share a vertex but one quadrant
  // of the wt×wt column would otherwise be empty.
  const pillarVerts = new Set()  // "vC:vR" at grid-line intersections

  // Push a wall segment and record its two endpoint vertices.
  // Vertices are in grid-vertex coordinates: (vC, vR) maps to physical
  // position (owt + vC*cellSize, owt + vR*cellSize).
  const addWall = (size, center, vC1, vR1, vC2, vR2) => {
    fills.push(cuboid({ size, center }))
    pillarVerts.add(`${vC1}:${vR1}`)
    pillarVerts.add(`${vC2}:${vR2}`)
  }

  // Solid cell blocks (full cell volume; boundary walls handled below)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c]) {
        fills.push(cuboid({
          size: [cellSize, cellSize, innerH],
          center: [
            owt + c * cellSize + cellSize / 2,
            owt + r * cellSize + cellSize / 2,
            bottomThickness + innerH / 2,
          ],
        }))
      }
    }
  }

  // Walls at solid↔hollow cell boundaries (issue 1).
  // The wall is wt thick, centered on the shared edge — wt/2 protrudes into
  // the hollow side, wt/2 overlaps the solid block (CSG union absorbs it).
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c] !== cells[r + 1][c]) {
        addWall(
          [cellSize, wt, innerH],
          [owt + c * cellSize + cellSize / 2, owt + (r + 1) * cellSize, bottomThickness + innerH / 2],
          c, r + 1, c + 1, r + 1,
        )
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (cells[r][c] !== cells[r][c + 1]) {
        addWall(
          [wt, cellSize, innerH],
          [owt + (c + 1) * cellSize, owt + r * cellSize + cellSize / 2, bottomThickness + innerH / 2],
          c + 1, r, c + 1, r + 1,
        )
      }
    }
  }

  // Explicit compartment walls between hollow cells
  for (const key of walls) {
    if (key.startsWith('h:')) {
      const [, r, c] = key.split(':').map(Number)
      if (r > 0 && r < rows && cells[r - 1][c] === false && cells[r][c] === false) {
        addWall(
          [cellSize, wt, innerH],
          [owt + c * cellSize + cellSize / 2, owt + r * cellSize, bottomThickness + innerH / 2],
          c, r, c + 1, r,
        )
      }
    } else if (key.startsWith('v:')) {
      const [, r, c] = key.split(':').map(Number)
      if (c > 0 && c < cols && cells[r][c - 1] === false && cells[r][c] === false) {
        addWall(
          [wt, cellSize, innerH],
          [owt + c * cellSize, owt + r * cellSize + cellSize / 2, bottomThickness + innerH / 2],
          c, r, c, r + 1,
        )
      }
    }
  }

  // Corner pillars (issue 2): a wt×wt column at every wall-segment vertex
  // fills whichever quadrant of the junction the adjacent wall cuboids miss.
  for (const v of pillarVerts) {
    const [vC, vR] = v.split(':').map(Number)
    fills.push(cuboid({
      size: [wt, wt, innerH],
      center: [owt + vC * cellSize, owt + vR * cellSize, bottomThickness + innerH / 2],
    }))
  }

  if (fills.length > 0) {
    model = union(model, ...fills)
  }

  return solidToThree(model)
}
