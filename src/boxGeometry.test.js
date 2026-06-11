import { describe, it, expect } from 'vitest'
import { buildBoxParts } from './boxGeometry.js'

// Shared params for all tests
// 1×1 grid → totalW = 1*10 + 2*4 = 18, totalD = 1*10 + 2*4 = 18
const P = { cellSize: 10, boxHeight: 20, wallThickness: 2, bottomThickness: 3, outerWallThickness: 4 }

describe('buildBoxParts — bottom plate', () => {
  it('produces bottom plate as parts[0]', () => {
    const parts = buildBoxParts([[false]], new Set(), P)
    expect(parts[0]).toEqual({ center: [9, 9, 1.5], size: [18, 18, 3] })
  })
})

describe('buildBoxParts — outer walls', () => {
  it('produces 4 outer walls as parts[1..4]', () => {
    const parts = buildBoxParts([[false]], new Set(), P)
    expect(parts[1]).toEqual({ center: [2,  9, 10], size: [4,  18, 20] }) // left
    expect(parts[2]).toEqual({ center: [16, 9, 10], size: [4,  18, 20] }) // right
    expect(parts[3]).toEqual({ center: [9,  2, 10], size: [10, 4,  20] }) // front
    expect(parts[4]).toEqual({ center: [9, 16, 10], size: [10, 4,  20] }) // back
  })
})

describe('buildBoxParts — solid cell blocks', () => {
  it('generates no extra part for a hollow cell', () => {
    const parts = buildBoxParts([[false]], new Set(), P)
    expect(parts).toHaveLength(5) // bottom + 4 outer walls
  })

  it('generates one solid block for a solid cell in a 1×1 grid', () => {
    // block z: bottomThickness(3) to boxHeight(20) → height = 17, center z = 3 + 8.5 = 11.5
    const parts = buildBoxParts([[true]], new Set(), P)
    expect(parts).toHaveLength(6)
    expect(parts[5]).toEqual({ center: [9, 9, 11.5], size: [10, 10, 17] })
  })

  it('only generates a block for the solid cell in a mixed 1×2 grid', () => {
    // cells[0][0]=true at col 0: center x = owt + 0*cellSize + cellSize/2 = 4+5 = 9
    const parts = buildBoxParts([[true, false]], new Set(), P)
    expect(parts).toHaveLength(6) // bottom + 4 outer + 1 solid block
    expect(parts[5]).toEqual({ center: [9, 9, 11.5], size: [10, 10, 17] })
  })
})

describe('buildBoxParts — explicit inner walls', () => {
  it('adds a vertical wall between two hollow cells', () => {
    // v:0:1 — column boundary at c=1, between cells[0][0] and cells[0][1]
    // center x = owt + c*cellSize = 4 + 10 = 14
    // center y = owt + r*cellSize + cellSize/2 = 4 + 0 + 5 = 9
    // center z = bottomThickness + innerH/2 = 3 + 8.5 = 11.5
    const parts = buildBoxParts([[false, false]], new Set(['v:0:1']), P)
    expect(parts).toHaveLength(6) // bottom + 4 outer + 1 inner wall
    expect(parts[5]).toEqual({ center: [14, 9, 11.5], size: [2, 10, 17] })
  })

  it('adds a horizontal wall between two hollow cells', () => {
    // h:1:0 — row boundary at r=1, between cells[0][0] and cells[1][0]
    // center x = owt + c*cellSize + cellSize/2 = 4 + 0 + 5 = 9
    // center y = owt + r*cellSize = 4 + 10 = 14
    // center z = 3 + 8.5 = 11.5
    const parts = buildBoxParts([[false], [false]], new Set(['h:1:0']), P)
    expect(parts).toHaveLength(6)
    expect(parts[5]).toEqual({ center: [9, 14, 11.5], size: [10, 2, 17] })
  })

  it('skips outer boundary wall keys', () => {
    // All 4 boundary keys for a 1×1 grid: r=0, r=rows=1, c=0, c=cols=1
    const walls = new Set(['h:0:0', 'h:1:0', 'v:0:0', 'v:0:1'])
    const parts = buildBoxParts([[false]], walls, P)
    expect(parts).toHaveLength(5) // no inner walls added
  })

  it('skips a vertical wall when one adjacent cell is solid', () => {
    // cells[0][0]=true (solid), cells[0][1]=false; wall v:0:1 present
    // solid cell provides the wall — no extra geometry needed
    const parts = buildBoxParts([[true, false]], new Set(['v:0:1']), P)
    expect(parts).toHaveLength(6) // bottom + 4 outer + 1 solid block (no inner wall)
  })
})
