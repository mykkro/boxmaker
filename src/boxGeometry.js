export function buildBoxParts(cells, walls, params) {
  const { cellSize, boxHeight, wallThickness, bottomThickness, outerWallThickness: owt } = params
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const totalW = cols * cellSize + 2 * owt
  const totalD = rows * cellSize + 2 * owt
  const innerH = boxHeight - bottomThickness

  const parts = []

  // Bottom plate
  parts.push({ center: [totalW / 2, totalD / 2, bottomThickness / 2], size: [totalW, totalD, bottomThickness] })

  // Outer walls
  parts.push({ center: [owt / 2,          totalD / 2,       boxHeight / 2], size: [owt,              totalD, boxHeight] }) // left
  parts.push({ center: [totalW - owt / 2, totalD / 2,       boxHeight / 2], size: [owt,              totalD, boxHeight] }) // right
  parts.push({ center: [totalW / 2,       owt / 2,          boxHeight / 2], size: [totalW - 2 * owt, owt,    boxHeight] }) // front
  parts.push({ center: [totalW / 2,       totalD - owt / 2, boxHeight / 2], size: [totalW - 2 * owt, owt,    boxHeight] }) // back

  // Solid cell blocks
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c]) {
        parts.push({
          center: [
            owt + c * cellSize + cellSize / 2,
            owt + r * cellSize + cellSize / 2,
            bottomThickness + innerH / 2
          ],
          size: [cellSize, cellSize, innerH]
        })
      }
    }
  }

  return parts
}
