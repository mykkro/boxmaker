<script>
  import Sidebar from './Sidebar.svelte'
  import GridDesigner from './GridDesigner.svelte'
  import { makeCells, applyOperation, compartmentEdges } from './grid.js'

  let cols = $state(5)
  let rows = $state(3)
  let cells = $state(makeCells(rows, cols))
  let walls = $state(new Set())
  let mode = $state('hollow')
  let history = $state([])

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

    if (mode === 'compartment') {
      const next = new Set(walls)
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
</script>

<div class="app">
  <Sidebar
    {cols}
    {rows}
    {mode}
    canUndo={history.length > 0}
    onsetsize={handleSetSize}
    onsetmode={handleSetMode}
    onundo={handleUndo}
  />
  <main>
    <GridDesigner {cells} {mode} {walls} oncommit={handleCommit} />
  </main>
</div>

<style>
  .app {
    display: flex;
    height: 100vh;
    background: #f0f0f0;
  }
  main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 24px;
  }
</style>
