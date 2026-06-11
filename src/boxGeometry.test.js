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
