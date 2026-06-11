import { describe, it, expect } from 'vitest'
import { makeCells, applyOperation, computeWalls } from './grid.js'

describe('makeCells', () => {
  it('creates rows x cols 2D array filled with true', () => {
    const cells = makeCells(2, 3)
    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveLength(3)
    expect(cells[0][0]).toBe(true)
    expect(cells[1][2]).toBe(true)
  })

  it('creates independent rows (not shared references)', () => {
    const cells = makeCells(2, 2)
    cells[0][0] = false
    expect(cells[1][0]).toBe(true)
  })
})

describe('applyOperation', () => {
  it('sets selection to false in hollow mode', () => {
    const cells = makeCells(3, 3)
    const result = applyOperation(cells, { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, 'hollow')
    expect(result[0][0]).toBe(false)
    expect(result[0][1]).toBe(false)
    expect(result[1][0]).toBe(false)
    expect(result[1][1]).toBe(false)
    expect(result[2][0]).toBe(true) // outside selection unchanged
    expect(result[0][2]).toBe(true) // outside selection unchanged
  })

  it('sets selection to true in fill mode', () => {
    const cells = [[false, false, true], [false, false, true]]
    const result = applyOperation(cells, { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, 'fill')
    expect(result[0][0]).toBe(true)
    expect(result[1][1]).toBe(true)
    expect(result[0][2]).toBe(true) // outside selection unchanged
  })

  it('does not mutate the original cells array', () => {
    const cells = makeCells(2, 2)
    applyOperation(cells, { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }, 'hollow')
    expect(cells[0][0]).toBe(true)
  })
})

describe('computeWalls', () => {
  it('returns 4 edges for a 1x1 grid, all walls', () => {
    const cells = [[true]]
    const edges = computeWalls(cells, 40)
    // 2 horizontal (top + bottom) + 2 vertical (left + right) = 4
    expect(edges).toHaveLength(4)
    expect(edges.every(e => e.type === 'wall')).toBe(true)
  })

  it('marks outer edges as walls for an all-solid grid', () => {
    const cells = makeCells(2, 2)
    const edges = computeWalls(cells, 40)
    // Outer edges: top row 2 edges + bottom row 2 edges + left col 2 edges + right col 2 edges = 8
    const walls = edges.filter(e => e.type === 'wall')
    expect(walls.length).toBe(8)
  })

  it('marks interior edge between two hollow cells as ghost', () => {
    const cells = [[false, false]]
    const edges = computeWalls(cells, 40)
    // The vertical edge between col 0 and col 1 at x=40
    const interior = edges.find(e => e.x1 === 40 && e.x2 === 40 && e.y1 === 0 && e.y2 === 40)
    expect(interior?.type).toBe('ghost')
  })

  it('marks interior edge between hollow and solid as wall', () => {
    const cells = [[true, false]]
    const edges = computeWalls(cells, 40)
    // The vertical edge at x=40 separates solid (left) and hollow (right)
    const boundary = edges.find(e => e.x1 === 40 && e.x2 === 40 && e.y1 === 0 && e.y2 === 40)
    expect(boundary?.type).toBe('wall')
  })

  it('uses correct SVG coordinates for a 2x2 grid with cellSize 10', () => {
    const cells = makeCells(2, 2)
    const edges = computeWalls(cells, 10)
    // Bottom edge of bottom row at y=20
    const bottomEdge = edges.filter(e => e.y1 === 20 && e.y2 === 20)
    expect(bottomEdge).toHaveLength(2)
  })
})
