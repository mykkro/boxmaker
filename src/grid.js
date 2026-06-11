export function makeCells(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(true))
}

export function applyOperation(cells, { minRow, maxRow, minCol, maxCol }, mode) {
  const value = mode === 'fill'
  return cells.map((row, r) =>
    row.map((cell, c) =>
      r >= minRow && r <= maxRow && c >= minCol && c <= maxCol ? value : cell
    )
  )
}

export function computeWalls(cells, cellSize) {
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const edges = []

  // Horizontal edges — run along the top of each row boundary
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isOuter = r === 0 || r === rows
      const above = r > 0 ? cells[r - 1][c] : true
      const below = r < rows ? cells[r][c] : true
      const type = isOuter || above !== below ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: (c + 1) * cellSize, y2: r * cellSize, type })
    }
  }

  // Vertical edges — run along the left of each column boundary
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const isOuter = c === 0 || c === cols
      const left = c > 0 ? cells[r][c - 1] : true
      const right = c < cols ? cells[r][c] : true
      const type = isOuter || left !== right ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: c * cellSize, y2: (r + 1) * cellSize, type })
    }
  }

  return edges
}
