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
