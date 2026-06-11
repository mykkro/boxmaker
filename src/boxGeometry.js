import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import polygonClipping from 'polygon-clipping'

function toClipRect(x1, y1, x2, y2) {
  return [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]]
}

// Returns the list of [x1,y1,x2,y2] rectangles that form the wall footprint.
// Outer walls + explicit compartment walls between hollow cells.
export function wallRects(cells, walls, params) {
  const { cellSize, wallThickness, outerWallThickness: owt } = params
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const totalW = cols * cellSize + 2 * owt
  const totalD = rows * cellSize + 2 * owt

  const rects = [
    [0,           0,           owt,        totalD],
    [totalW - owt, 0,          totalW,     totalD],
    [0,           0,           totalW,     owt],
    [0,           totalD - owt, totalW,    totalD],
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

function buildWallShapes(cells, walls, params) {
  const rects = wallRects(cells, walls, params)
  const union = polygonClipping.union(...rects.map(([x1, y1, x2, y2]) => toClipRect(x1, y1, x2, y2)))

  return union.map(poly => {
    const shape = new THREE.Shape()
    const outer = poly[0]
    shape.moveTo(outer[0][0], -outer[0][1])
    for (let i = 1; i < outer.length - 1; i++) shape.lineTo(outer[i][0], -outer[i][1])
    for (let h = 1; h < poly.length; h++) {
      const hole = new THREE.Path()
      const ring = poly[h]
      hole.moveTo(ring[0][0], -ring[0][1])
      for (let i = 1; i < ring.length - 1; i++) hole.lineTo(ring[i][0], -ring[i][1])
      shape.holes.push(hole)
    }
    return shape
  })
}

export function buildGeometry(cells, walls, params) {
  const { cellSize, boxHeight, wallThickness, bottomThickness, outerWallThickness: owt } = params
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const totalW = cols * cellSize + 2 * owt
  const totalD = rows * cellSize + 2 * owt
  const innerH = boxHeight - bottomThickness

  const geometries = []

  // Bottom plate
  const bottom = new THREE.BoxGeometry(totalW, bottomThickness, totalD)
  bottom.translate(totalW / 2, bottomThickness / 2, totalD / 2)
  geometries.push(bottom)

  // Solid cell blocks
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c]) {
        const g = new THREE.BoxGeometry(cellSize, innerH, cellSize)
        g.translate(owt + c * cellSize + cellSize / 2, bottomThickness + innerH / 2, owt + r * cellSize + cellSize / 2)
        geometries.push(g)
      }
    }
  }

  // Wall extrusion: dilate edges → union footprint → extrude
  // Shape defined in (design_x, -design_y) so that rotateX(-π/2) maps:
  //   shape-X → Three.js X, shape-Y(-design_y) → Three.js Z(design_y), extrusion-Z → Three.js Y
  for (const shape of buildWallShapes(cells, walls, params)) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: innerH, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bottomThickness, 0)
    geometries.push(g)
  }

  const merged = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  return merged
}
