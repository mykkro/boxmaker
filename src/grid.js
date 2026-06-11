export function makeCells(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(true))
}

export function applyOperation(cells, { minRow, maxRow, minCol, maxCol }, mode) {
  if (mode !== 'hollow' && mode !== 'fill') throw new Error(`Unknown mode: ${mode}`)
  const value = mode === 'fill'
  return cells.map((row, r) =>
    row.map((cell, c) =>
      r >= minRow && r <= maxRow && c >= minCol && c <= maxCol ? value : cell
    )
  )
}

export function compartmentEdges({ minRow, maxRow, minCol, maxCol }) {
  const keys = new Set()
  for (let c = minCol; c <= maxCol; c++) {
    keys.add(`h:${minRow}:${c}`)
    keys.add(`h:${maxRow + 1}:${c}`)
  }
  for (let r = minRow; r <= maxRow; r++) {
    keys.add(`v:${r}:${minCol}`)
    keys.add(`v:${r}:${maxCol + 1}`)
  }
  return keys
}

export function computeWalls(cells, cellSize, explicitWalls = new Set()) {
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const edges = []

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isOuter = r === 0 || r === rows
      const above = r > 0 ? cells[r - 1][c] : true
      const below = r < rows ? cells[r][c] : true
      const type = isOuter || above !== below || explicitWalls.has(`h:${r}:${c}`) ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: (c + 1) * cellSize, y2: r * cellSize, type })
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const isOuter = c === 0 || c === cols
      const left = c > 0 ? cells[r][c - 1] : true
      const right = c < cols ? cells[r][c] : true
      const type = isOuter || left !== right || explicitWalls.has(`v:${r}:${c}`) ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: c * cellSize, y2: (r + 1) * cellSize, type })
    }
  }

  return edges
}
