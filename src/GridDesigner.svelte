<script>
  const CELL_SIZE = 40

  let { cells, mode, oncommit } = $props()

  const rows = $derived(cells.length)
  const cols = $derived(cells[0]?.length ?? 0)
  const svgWidth = $derived(cols * CELL_SIZE)
  const svgHeight = $derived(rows * CELL_SIZE)
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
</svg>
