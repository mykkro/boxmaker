<script>
  import Sidebar from './Sidebar.svelte'
  import GridDesigner from './GridDesigner.svelte'
  import BoxPreview3D from './BoxPreview3D.svelte'
  import { makeCells, applyOperation, compartmentEdges } from './grid.js'

  // Read initial state from ?s= query param synchronously so first render is correct.
  function readUrlState() {
    try {
      const s = new URLSearchParams(window.location.search).get('s')
      return s ? JSON.parse(atob(s)) : null
    } catch { return null }
  }
  const _init = readUrlState()

  let cols = $state(_init?.c ?? 5)
  let rows = $state(_init?.r ?? 3)
  let cells = $state(
    _init?.g ? _init.g.map(row => row.map(v => v === 1)) : makeCells(rows, cols)
  )
  let walls = $state(new Set(_init?.w ?? []))
  let mode = $state('hollow')
  let history = $state([])

  let split = $state(_init?.sp ?? 0.5)
  let gridZoom = $state(_init?.gz ?? 1)
  let workspaceEl

  function onDividerPointerdown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onDividerPointermove(e) {
    if (!e.buttons) return
    const rect = workspaceEl.getBoundingClientRect()
    split = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height))
  }

  let cellSize = $state(_init?.cs ?? 20)
  let boxHeight = $state(_init?.bh ?? 30)
  let wallThickness = $state(_init?.wt ?? 1.5)
  let bottomThickness = $state(_init?.bt ?? 2)
  let outerWallThickness = $state(_init?.ow ?? 3)
  let cornerRadius = $state(_init?.cr ?? 5)

  // Keep URL in sync with current state via replaceState (no extra history entries).
  $effect(() => {
    const s = btoa(JSON.stringify({
      c: cols, r: rows,
      g: cells.map(row => row.map(v => v ? 1 : 0)),
      w: [...walls],
      cs: cellSize, bh: boxHeight, wt: wallThickness,
      bt: bottomThickness, ow: outerWallThickness,
      cr: cornerRadius, sp: split, gz: gridZoom,
    }))
    window.history.replaceState(null, '', `?s=${s}`)
  })

  // Share button state
  let shareMsg = $state('')

  function handleShare() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      shareMsg = 'Copied!'
      setTimeout(() => { shareMsg = '' }, 2000)
    }).catch(() => {
      shareMsg = url   // fallback: show URL so user can manually copy
    })
  }

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
      <GridDesigner {cells} {mode} {walls} zoom={gridZoom} oncommit={handleCommit} onzoom={z => gridZoom = z} />
    </div>
    <div
      class="divider"
      onpointerdown={onDividerPointerdown}
      onpointermove={onDividerPointermove}
    ></div>
    <div class="preview-header">
      <span class="size-label">
        {cols * cellSize + 2 * outerWallThickness} × {rows * cellSize + 2 * outerWallThickness} × {boxHeight} mm
      </span>
      {#if shareMsg.startsWith('http')}
        <input class="share-url" value={shareMsg} readonly onclick={e => e.target.select()} />
      {:else}
        <button class="share-btn" onclick={handleShare}>
          {shareMsg || '⎘ Share'}
        </button>
      {/if}
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    letter-spacing: 0.05em;
  }
  .size-label {
    flex: 1;
    text-align: center;
  }
  .share-btn {
    flex-shrink: 0;
    background: #333;
    border: 1px solid #555;
    border-radius: 3px;
    color: #aaa;
    padding: 2px 8px;
    font-size: 11px;
    font-family: monospace;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .share-btn:hover {
    background: #444;
    color: white;
  }
  .share-url {
    flex-shrink: 1;
    min-width: 0;
    width: 240px;
    background: #1a1a1a;
    border: 1px solid #3a7bd5;
    border-radius: 3px;
    color: #7ab4ff;
    padding: 2px 6px;
    font-size: 10px;
    font-family: monospace;
    outline: none;
  }
  .preview-pane {
    min-height: 0;
    background: #1a1a1a;
    position: relative;
  }
</style>
