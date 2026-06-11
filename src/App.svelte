<script>
  import Sidebar from './Sidebar.svelte'
  import GridDesigner from './GridDesigner.svelte'
  import BoxPreview3D from './BoxPreview3D.svelte'
  import { makeCells, applyOperation, compartmentEdges } from './grid.js'

  let cols = $state(5)
  let rows = $state(3)
  let cells = $state(makeCells(rows, cols))
  let walls = $state(new Set())
  let mode = $state('hollow')
  let history = $state([])

  let cellSize = $state(20)
  let boxHeight = $state(30)
  let wallThickness = $state(1.5)
  let bottomThickness = $state(2)
  let outerWallThickness = $state(3)

  function handleSetSize(newCols, newRows) {
    if (newCols < 1 || newRows < 1) return
    cols = newCols
    rows = newRows
    cells = makeCells(newRows, newCols)
    walls = new Set()
    history = []
  }

  function handleSetMode(newMode) {
    mode = newMode
  }

  function handleUndo() {
    if (history.length === 0) return
    cells = history[history.length - 1].cells
    walls = history[history.length - 1].walls
    history = history.slice(0, -1)
  }

  function handleCommit(selection) {
    history = [...history, { cells, walls }]

    const cellMode = mode === 'fill' ? 'fill' : 'hollow'
    cells = applyOperation(cells, selection, cellMode)

    if (mode === 'hollow') {
      const { minRow, maxRow, minCol, maxCol } = selection
      const next = new Set(walls)
      for (let r = minRow + 1; r <= maxRow; r++)
        for (let c = minCol; c <= maxCol; c++)
          next.delete(`h:${r}:${c}`)
      for (let r = minRow; r <= maxRow; r++)
        for (let c = minCol + 1; c <= maxCol; c++)
          next.delete(`v:${r}:${c}`)
      walls = next
    } else if (mode === 'compartment') {
      const { minRow, maxRow, minCol, maxCol } = selection
      const next = new Set(walls)
      for (let r = minRow + 1; r <= maxRow; r++)
        for (let c = minCol; c <= maxCol; c++)
          next.delete(`h:${r}:${c}`)
      for (let r = minRow; r <= maxRow; r++)
        for (let c = minCol + 1; c <= maxCol; c++)
          next.delete(`v:${r}:${c}`)
      for (const key of compartmentEdges(selection)) next.add(key)
      walls = next
    } else if (mode === 'fill') {
      const { minRow, maxRow, minCol, maxCol } = selection
      const next = new Set(walls)
      for (let r = minRow; r <= maxRow + 1; r++)
        for (let c = minCol; c <= maxCol; c++)
          next.delete(`h:${r}:${c}`)
      for (let r = minRow; r <= maxRow; r++)
        for (let c = minCol; c <= maxCol + 1; c++)
          next.delete(`v:${r}:${c}`)
      walls = next
    }
  }

  function handleSetDimensions(update) {
    if ('cellSize' in update) cellSize = update.cellSize
    if ('boxHeight' in update) boxHeight = update.boxHeight
    if ('wallThickness' in update) wallThickness = update.wallThickness
    if ('bottomThickness' in update) bottomThickness = update.bottomThickness
    if ('outerWallThickness' in update) outerWallThickness = update.outerWallThickness
  }
</script>

<div class="app">
  <Sidebar
    {cols}
    {rows}
    {mode}
    canUndo={history.length > 0}
    {cellSize}
    {boxHeight}
    {wallThickness}
    {bottomThickness}
    {outerWallThickness}
    onsetsize={handleSetSize}
    onsetmode={handleSetMode}
    onundo={handleUndo}
    onsetdimensions={handleSetDimensions}
  />
  <div class="workspace">
    <div class="grid-pane">
      <GridDesigner {cells} {mode} {walls} oncommit={handleCommit} />
    </div>
    <div class="preview-pane">
      <BoxPreview3D
        {cells}
        {walls}
        {cellSize}
        {boxHeight}
        {wallThickness}
        {bottomThickness}
        {outerWallThickness}
      />
    </div>
  </div>
</div>

<style>
  .app {
    display: flex;
    height: 100vh;
    background: #f0f0f0;
  }
  .workspace {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .grid-pane {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 24px;
    min-height: 0;
  }
  .preview-pane {
    height: 320px;
    flex-shrink: 0;
    border-top: 2px solid #444;
    background: #1a1a1a;
    position: relative;
  }
</style>
