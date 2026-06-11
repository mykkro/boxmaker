<script>
  import { computeWalls } from './grid.js'

  const CELL_SIZE = 40

  let { cells, mode, walls, oncommit } = $props()

  const rows = $derived(cells.length)
  const cols = $derived(cells[0]?.length ?? 0)
  const svgWidth = $derived(cols * CELL_SIZE)
  const svgHeight = $derived(rows * CELL_SIZE)
  const wallEdges = $derived(computeWalls(cells, CELL_SIZE, walls))

  let dragStart = $state(null)
  let dragEnd = $state(null)

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
    return {
      col: Math.max(0, Math.min(cols - 1, Math.floor(x / CELL_SIZE))),
      row: Math.max(0, Math.min(rows - 1, Math.floor(y / CELL_SIZE))),
    }
  }

  function handlePointerdown(e) {
    if (e.button !== 0) return
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
  width={svgWidth}
  height={svgHeight}
  onpointerdown={handlePointerdown}
  onpointermove={handlePointermove}
  onpointerup={handlePointerup}
  style="cursor: crosshair; user-select: none; display: block;"
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
