import { describe, it, expect } from 'vitest'
import { wallRects } from './boxGeometry.js'

// 1×1 grid: totalW = 1*10 + 2*4 = 18, totalD = 1*10 + 2*4 = 18
const P = { cellSize: 10, boxHeight: 20, wallThickness: 2, bottomThickness: 3, outerWallThickness: 4 }

describe('wallRects — outer walls', () => {
  it('produces 4 outer wall rects for a 1×1 hollow grid', () => {
    const rects = wallRects([[false]], new Set(), P)
    expect(rects).toHaveLength(4)
    // left
    expect(rects[0]).toEqual([0, 0, 4, 18])
    // right
    expect(rects[1]).toEqual([14, 0, 18, 18])
    // front
    expect(rects[2]).toEqual([0, 0, 18, 4])
    // back
    expect(rects[3]).toEqual([0, 14, 18, 18])
  })

  it('outer wall dimensions scale with cols/rows', () => {
    // 2×3 grid: totalW=2*10+8=28, totalD=3*10+8=38
    const rects = wallRects([[false,false],[false,false],[false,false]], new Set(), P)
    expect(rects[0]).toEqual([0, 0, 4, 38])   // left
    expect(rects[1]).toEqual([24, 0, 28, 38])  // right
    expect(rects[2]).toEqual([0, 0, 28, 4])    // front
    expect(rects[3]).toEqual([0, 34, 28, 38])  // back
  })
})

describe('wallRects — compartment walls', () => {
  it('adds a vertical wall rect between two hollow cells', () => {
    // v:0:1 — column boundary c=1 between cells[0][0] and cells[0][1]
    // xc = 4 + 1*10 = 14; half-thickness = 1
    const rects = wallRects([[false, false]], new Set(['v:0:1']), P)
    expect(rects).toHaveLength(5)
    expect(rects[4]).toEqual([13, 4, 15, 14])
  })

  it('adds a horizontal wall rect between two hollow cells', () => {
    // h:1:0 — row boundary r=1 between cells[0][0] and cells[1][0]
    // yc = 4 + 1*10 = 14; half-thickness = 1
    const rects = wallRects([[false], [false]], new Set(['h:1:0']), P)
    expect(rects).toHaveLength(5)
    expect(rects[4]).toEqual([4, 13, 14, 15])
  })

  it('skips a wall when one adjacent cell is solid', () => {
    const rects = wallRects([[true, false]], new Set(['v:0:1']), P)
    expect(rects).toHaveLength(4) // no inner wall added
  })

  it('skips outer boundary wall keys', () => {
    const walls = new Set(['h:0:0', 'h:1:0', 'v:0:0', 'v:0:1'])
    const rects = wallRects([[false]], walls, P)
    expect(rects).toHaveLength(4) // only outer walls
  })
})
