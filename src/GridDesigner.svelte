<script>
  let { cells, mode, oncommit } = $props()
</script>

<p style="color:#999">Grid coming soon — {cells.length} rows × {cells[0]?.length ?? 0} cols</p>
