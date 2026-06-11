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

  let split = $state(0.5)
  let workspaceEl

  function onDividerPointerdown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onDividerPointermove(e) {
    if (!e.buttons) return
    const rect = workspaceEl.getBoundingClientRect()
    split = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height))
  }

  let cellSize = $state(20)
  let boxHeight = $state(30)
  let wallThickness = $state(1.5)
  let bottomThickness = $state(2)
  let outerWallThickness = $state(3)
  let cornerRadius = $state(5)

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
    if ('cornerRadius' in update) cornerRadius = update.cornerRadius
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
    {cornerRadius}
    onsetsize={handleSetSize}
    onsetmode={handleSetMode}
    onundo={handleUndo}
    onsetdimensions={handleSetDimensions}
  />
  <div class="workspace" bind:this={workspaceEl}>
    <div class="grid-pane" style="flex: {split}">
      <GridDesigner {cells} {mode} {walls} oncommit={handleCommit} />
    </div>
    <div
      class="divider"
      onpointerdown={onDividerPointerdown}
      onpointermove={onDividerPointermove}
    ></div>
    <div class="preview-header">
      {cols * cellSize + 2 * outerWallThickness} × {rows * cellSize + 2 * outerWallThickness} × {boxHeight} mm
    </div>
    <div class="preview-pane" style="flex: {1 - split}">
      <BoxPreview3D
        {cells}
        {walls}
        {cellSize}
        {boxHeight}
        {wallThickness}
        {bottomThickness}
        {outerWallThickness}
        {cornerRadius}
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
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 24px;
    min-height: 0;
  }
  .divider {
    flex-shrink: 0;
    height: 5px;
    background: #3a3a3a;
    cursor: row-resize;
    touch-action: none;
    transition: background 0.15s;
  }
  .divider:hover, .divider:active {
    background: #3a7bd5;
  }
  .preview-header {
    flex-shrink: 0;
    background: #2a2a2a;
    color: #aaa;
    font-size: 12px;
    font-family: monospace;
    padding: 4px 12px;
    border-top: 2px solid #444;
    text-align: center;
    letter-spacing: 0.05em;
  }
  .preview-pane {
    min-height: 0;
    background: #1a1a1a;
    position: relative;
  }
</style>
