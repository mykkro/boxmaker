<script>
  let { cols, rows, mode, canUndo, onsetsize, onsetmode, onundo } = $props()
</script>

<aside>
  <h1>BoxMaker</h1>

  <section>
    <span class="label">GRID SIZE</span>
    <label>
      Cols
      <input
        type="number" min="1" max="20" value={cols}
        oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 1) onsetsize(Math.min(20, v), rows) }}
      />
    </label>
    <label>
      Rows
      <input
        type="number" min="1" max="20" value={rows}
        oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 1) onsetsize(cols, Math.min(20, v)) }}
      />
    </label>
  </section>

  <section>
    <span class="label">MODE</span>
    <button class:active={mode === 'hollow'} onclick={() => onsetmode('hollow')}>
      ⬡ Hollow
    </button>
    <button class:active={mode === 'fill'} onclick={() => onsetmode('fill')}>
      ▦ Fill
    </button>
  </section>

  <section>
    <button onclick={onundo} disabled={!canUndo}>↩ Undo</button>
  </section>
</aside>

<style>
  aside {
    width: 130px;
    flex-shrink: 0;
    background: #2a2a2a;
    color: white;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  h1 {
    font-size: 13px;
    font-weight: bold;
    color: #aaa;
    margin: 0 0 16px 0;
    letter-spacing: 0.05em;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid #444;
    padding: 12px 0;
  }
  .label {
    font-size: 9px;
    color: #888;
    letter-spacing: 0.1em;
  }
  label {
    font-size: 12px;
    color: #ccc;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  input[type="number"] {
    background: #333;
    border: 1px solid #555;
    border-radius: 3px;
    color: white;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    outline: none;
  }
  input[type="number"]:focus {
    border-color: #3a7bd5;
  }
  button {
    background: #333;
    border: 1px solid #555;
    border-radius: 3px;
    color: white;
    padding: 6px 8px;
    font-size: 12px;
    cursor: pointer;
    text-align: center;
    transition: background 0.1s;
  }
  button:hover:not(:disabled) {
    background: #444;
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button.active {
    background: #3a7bd5;
    border-color: #2a5ba5;
  }
</style>
