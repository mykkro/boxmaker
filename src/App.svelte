<script>
  import Sidebar from './Sidebar.svelte'
  import GridDesigner from './GridDesigner.svelte'
  import { makeCells, applyOperation } from './grid.js'

  let cols = $state(5)
  let rows = $state(3)
  let cells = $state(makeCells(rows, cols))
  let mode = $state('hollow')
  let history = $state([])

  function handleSetSize(newCols, newRows) {
    if (newCols < 1 || newRows < 1) return
    cols = newCols
    rows = newRows
    cells = makeCells(newRows, newCols)
    history = []
  }

  function handleSetMode(newMode) {
    mode = newMode
  }

  function handleUndo() {
    if (history.length === 0) return
    cells = history[history.length - 1]
    history = history.slice(0, -1)
  }

  function handleCommit(selection) {
    history = [...history, cells]
    cells = applyOperation(cells, selection, mode)
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
    <GridDesigner {cells} {mode} oncommit={handleCommit} />
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
