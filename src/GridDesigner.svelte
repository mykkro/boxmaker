<script>
  import { computeWalls } from './grid.js'

  const CELL_SIZE = 40

  let { cells, mode, walls, zoom, oncommit, onzoom } = $props()

  const rows = $derived(cells.length)
  const cols = $derived(cells[0]?.length ?? 0)
  const svgWidth = $derived(cols * CELL_SIZE)
  const svgHeight = $derived(rows * CELL_SIZE)
  const wallEdges = $derived(computeWalls(cells, CELL_SIZE, walls))

  let dragStart = $state(null)
  let dragEnd = $state(null)

  function wheelZoom(node) {
    function onWheel(e) {
      e.preventDefault()
      onzoom(Math.max(0.25, Math.min(4, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return { destroy() { node.removeEventListener('wheel', onWheel) } }
  }

  const selection = $derived(
    dragStart && dragEnd
      ? {
          minCol: Math.min(dragStart.col, dragEnd.col),
          maxCol: Math.max(dragStart.col, dragEnd.col),
          minRow: Math.min(dragStart.row, dragEnd.row),
          maxRow: Math.max(dragStart.row, dragEnd.row),
        }
      : null
  )

  function pointerToCell(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Use rect dimensions (which reflect the CSS scale transform) for hit-testing
    return {
      col: Math.max(0, Math.min(cols - 1, Math.floor(x * cols / rect.width))),
      row: Math.max(0, Math.min(rows - 1, Math.floor(y * rows / rect.height))),
    }
  }

  function handlePointerdown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const cell = pointerToCell(e)
    dragStart = cell
    dragEnd = cell
  }

  function handlePointermove(e) {
    if (!dragStart) return
    dragEnd = pointerToCell(e)
  }

  function handlePointerup() {
    if (!dragStart || !selection) return
    oncommit(selection)
    dragStart = null
    dragEnd = null
  }
</script>

<!-- sized wrapper so the parent overflow:auto sees the zoomed dimensions -->
<div style="width: {svgWidth * zoom}px; height: {svgHeight * zoom}px; flex-shrink: 0;">
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
  width={svgWidth}
  height={svgHeight}
  use:wheelZoom
  onpointerdown={handlePointerdown}
  onpointermove={handlePointermove}
  onpointerup={handlePointerup}
  style="transform: scale({zoom}); transform-origin: top left; cursor: crosshair; user-select: none; touch-action: none; display: block;"
>
  <!-- Cell layer -->
  {#each cells as row, r}
    {#each row as solid, c}
      <rect
        x={c * CELL_SIZE}
        y={r * CELL_SIZE}
        width={CELL_SIZE}
        height={CELL_SIZE}
        fill={solid ? '#d0d0d0' : '#3a7bd5'}
      />
    {/each}
  {/each}

  <!-- Wall layer -->
  {#each wallEdges as { x1, y1, x2, y2, type }}
    <line
      {x1} {y1} {x2} {y2}
      stroke={type === 'wall' ? '#333' : '#ccc'}
      stroke-width={type === 'wall' ? 3 : 0.5}
      stroke-linecap="square"
      pointer-events="none"
    />
  {/each}

  <!-- Drag preview layer -->
  {#if selection}
    <rect
      x={selection.minCol * CELL_SIZE}
      y={selection.minRow * CELL_SIZE}
      width={(selection.maxCol - selection.minCol + 1) * CELL_SIZE}
      height={(selection.maxRow - selection.minRow + 1) * CELL_SIZE}
      fill="rgba(58, 123, 213, 0.25)"
      stroke="#3a7bd5"
      stroke-width="2"
      stroke-dasharray="5 3"
      pointer-events="none"
    />
  {/if}
</svg>
</div>
