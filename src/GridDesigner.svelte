<script>
  import { computeWalls } from './grid.js'

  const CELL_SIZE = 40

  let { cells, mode, oncommit } = $props()

  const rows = $derived(cells.length)
  const cols = $derived(cells[0]?.length ?? 0)
  const svgWidth = $derived(cols * CELL_SIZE)
  const svgHeight = $derived(rows * CELL_SIZE)
  const walls = $derived(computeWalls(cells, CELL_SIZE))
</script>

<svg
  width={svgWidth}
  height={svgHeight}
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
  {#each walls as { x1, y1, x2, y2, type }}
    <line
      {x1} {y1} {x2} {y2}
      stroke={type === 'wall' ? '#333' : '#ccc'}
      stroke-width={type === 'wall' ? 3 : 0.5}
      stroke-linecap="square"
    />
  {/each}
</svg>
