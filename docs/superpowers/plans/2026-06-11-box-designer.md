# Box Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Svelte 5 web app where the user designs a grid-based box layout by marking cells as hollow or solid, with drag-to-select and undo support.

**Architecture:** Three components (`App`, `Sidebar`, `GridDesigner`) with all persistent state in App. Grid logic (wall computation, cell mutation) is extracted into a pure `grid.js` module that is independently tested. `GridDesigner` renders an SVG with three layers (cells, walls, drag preview) and owns drag state internally.

**Tech Stack:** Svelte 5, Vite 5, Vitest 1, no external UI libraries.

---

## File Map

| File | Purpose |
|---|---|
| `index.html` | App entry point, global reset styles |
| `vite.config.js` | Vite + Svelte plugin, Vitest jsdom config |
| `package.json` | Dependencies and scripts |
| `src/main.js` | Mounts App into `#app` |
| `src/grid.js` | Pure functions: `makeCells`, `applyOperation`, `computeWalls` |
| `src/grid.test.js` | Vitest unit tests for `grid.js` |
| `src/App.svelte` | Root — owns state, wires Sidebar ↔ GridDesigner |
| `src/Sidebar.svelte` | Dark left panel: size inputs, mode toggle, undo |
| `src/GridDesigner.svelte` | SVG grid: cells, walls, drag preview |

---

## Task 1: Initialize git and scaffold project

**Files:**
- Create: `index.html`
- Create: `package.json`
- Create: `vite.config.js`
- Create: `src/main.js`

- [ ] **Step 1: Initialize git**

```bash
cd c:/Work/boxmaker
git init
```

Expected: `Initialized empty Git repository in c:/Work/boxmaker/.git/`

- [ ] **Step 2: Create `.gitignore`**

Create `c:/Work/boxmaker/.gitignore`:
```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 3: Create `package.json`**

Create `c:/Work/boxmaker/package.json`:
```json
{
  "name": "boxmaker",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.1.0",
    "@testing-library/svelte": "^5.0.0",
    "jsdom": "^24.0.0",
    "svelte": "^5.0.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4: Create `vite.config.js`**

Create `c:/Work/boxmaker/vite.config.js`:
```js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] **Step 5: Create `index.html`**

Create `c:/Work/boxmaker/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BoxMaker</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/main.js`**

Create `c:/Work/boxmaker/src/main.js`:
```js
import { mount } from 'svelte'
import App from './App.svelte'

mount(App, { target: document.getElementById('app') })
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit**

```bash
git add index.html package.json vite.config.js src/main.js .gitignore
git commit -m "chore: scaffold Vite + Svelte 5 project"
```

---

## Task 2: Grid logic module (TDD)

**Files:**
- Create: `src/grid.js`
- Create: `src/grid.test.js`

- [ ] **Step 1: Write failing tests**

Create `c:/Work/boxmaker/src/grid.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { makeCells, applyOperation, computeWalls } from './grid.js'

describe('makeCells', () => {
  it('creates rows x cols 2D array filled with true', () => {
    const cells = makeCells(2, 3)
    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveLength(3)
    expect(cells[0][0]).toBe(true)
    expect(cells[1][2]).toBe(true)
  })

  it('creates independent rows (not shared references)', () => {
    const cells = makeCells(2, 2)
    cells[0][0] = false
    expect(cells[1][0]).toBe(true)
  })
})

describe('applyOperation', () => {
  it('sets selection to false in hollow mode', () => {
    const cells = makeCells(3, 3)
    const result = applyOperation(cells, { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, 'hollow')
    expect(result[0][0]).toBe(false)
    expect(result[0][1]).toBe(false)
    expect(result[1][0]).toBe(false)
    expect(result[1][1]).toBe(false)
    expect(result[2][0]).toBe(true) // outside selection unchanged
    expect(result[0][2]).toBe(true) // outside selection unchanged
  })

  it('sets selection to true in fill mode', () => {
    const cells = [[false, false, true], [false, false, true]]
    const result = applyOperation(cells, { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, 'fill')
    expect(result[0][0]).toBe(true)
    expect(result[1][1]).toBe(true)
    expect(result[0][2]).toBe(true) // outside selection unchanged
  })

  it('does not mutate the original cells array', () => {
    const cells = makeCells(2, 2)
    applyOperation(cells, { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }, 'hollow')
    expect(cells[0][0]).toBe(true)
  })
})

describe('computeWalls', () => {
  it('returns 4 edges for a 1x1 grid, all walls', () => {
    const cells = [[true]]
    const edges = computeWalls(cells, 40)
    // 2 horizontal (top + bottom) + 2 vertical (left + right) = 4
    expect(edges).toHaveLength(4)
    expect(edges.every(e => e.type === 'wall')).toBe(true)
  })

  it('marks outer edges as walls for an all-solid grid', () => {
    const cells = makeCells(2, 2)
    const edges = computeWalls(cells, 40)
    // Outer edges: top row 2 edges + bottom row 2 edges + left col 2 edges + right col 2 edges = 8
    const walls = edges.filter(e => e.type === 'wall')
    expect(walls.length).toBe(8)
  })

  it('marks interior edge between two hollow cells as ghost', () => {
    const cells = [[false, false]]
    const edges = computeWalls(cells, 40)
    // The vertical edge between col 0 and col 1 at x=40
    const interior = edges.find(e => e.x1 === 40 && e.x2 === 40 && e.y1 === 0 && e.y2 === 40)
    expect(interior?.type).toBe('ghost')
  })

  it('marks interior edge between hollow and solid as wall', () => {
    const cells = [[true, false]]
    const edges = computeWalls(cells, 40)
    // The vertical edge at x=40 separates solid (left) and hollow (right)
    const boundary = edges.find(e => e.x1 === 40 && e.x2 === 40 && e.y1 === 0 && e.y2 === 40)
    expect(boundary?.type).toBe('wall')
  })

  it('uses correct SVG coordinates for a 2x2 grid with cellSize 10', () => {
    const cells = makeCells(2, 2)
    const edges = computeWalls(cells, 10)
    // Bottom edge of bottom row at y=20
    const bottomEdge = edges.filter(e => e.y1 === 20 && e.y2 === 20)
    expect(bottomEdge).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module './grid.js'`

- [ ] **Step 3: Implement `src/grid.js`**

Create `c:/Work/boxmaker/src/grid.js`:
```js
export function makeCells(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(true))
}

export function applyOperation(cells, { minRow, maxRow, minCol, maxCol }, mode) {
  const value = mode === 'fill'
  return cells.map((row, r) =>
    row.map((cell, c) =>
      r >= minRow && r <= maxRow && c >= minCol && c <= maxCol ? value : cell
    )
  )
}

export function computeWalls(cells, cellSize) {
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const edges = []

  // Horizontal edges — run along the top of each row boundary
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isOuter = r === 0 || r === rows
      const above = r > 0 ? cells[r - 1][c] : true
      const below = r < rows ? cells[r][c] : true
      const type = isOuter || above !== below ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: (c + 1) * cellSize, y2: r * cellSize, type })
    }
  }

  // Vertical edges — run along the left of each column boundary
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const isOuter = c === 0 || c === cols
      const left = c > 0 ? cells[r][c - 1] : true
      const right = c < cols ? cells[r][c] : true
      const type = isOuter || left !== right ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: c * cellSize, y2: (r + 1) * cellSize, type })
    }
  }

  return edges
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected:
```
✓ src/grid.test.js (9)
  ✓ makeCells (2)
  ✓ applyOperation (3)
  ✓ computeWalls (4)
Test Files  1 passed (1)
Tests  9 passed (9)
```

- [ ] **Step 5: Commit**

```bash
git add src/grid.js src/grid.test.js
git commit -m "feat: add grid logic module with tests"
```

---

## Task 3: App.svelte and Sidebar.svelte

**Files:**
- Create: `src/App.svelte`
- Create: `src/Sidebar.svelte`

- [ ] **Step 1: Create `src/Sidebar.svelte`**

Create `c:/Work/boxmaker/src/Sidebar.svelte`:
```svelte
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
        oninput={e => onsetsize(Math.max(1, Math.min(20, Number(e.target.value))), rows)}
      />
    </label>
    <label>
      Rows
      <input
        type="number" min="1" max="20" value={rows}
        oninput={e => onsetsize(cols, Math.max(1, Math.min(20, Number(e.target.value))))}
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
```

- [ ] **Step 2: Create `src/App.svelte`**

Create `c:/Work/boxmaker/src/App.svelte`:
```svelte
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
```

- [ ] **Step 3: Create a minimal `src/GridDesigner.svelte` placeholder so the app compiles**

Create `c:/Work/boxmaker/src/GridDesigner.svelte`:
```svelte
<script>
  let { cells, mode, oncommit } = $props()
</script>

<p style="color:#999">Grid coming soon — {cells.length} rows × {cells[0]?.length ?? 0} cols</p>
```

- [ ] **Step 4: Start dev server and verify the layout renders**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Expected: dark left sidebar with "BoxMaker" title, Cols/Rows inputs defaulting to 5/3, Hollow/Fill buttons (Hollow highlighted blue), Undo button dimmed. Main area shows placeholder text "Grid coming soon — 3 rows × 5 cols".

Verify: clicking Fill button highlights it blue and Hollow becomes inactive. Changing Cols/Rows updates the placeholder text.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte src/Sidebar.svelte src/GridDesigner.svelte
git commit -m "feat: add App shell and Sidebar"
```

---

## Task 4: GridDesigner — cell layer

**Files:**
- Modify: `src/GridDesigner.svelte`

- [ ] **Step 1: Replace placeholder with SVG cell layer**

Replace the entire contents of `c:/Work/boxmaker/src/GridDesigner.svelte`:
```svelte
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
```

- [ ] **Step 2: Verify in browser**

The dev server should still be running at `http://localhost:5173`. Expected: a 5×3 grid of gray squares fills the main area. Resizing Cols/Rows in the sidebar changes the grid dimensions live.

- [ ] **Step 3: Commit**

```bash
git add src/GridDesigner.svelte
git commit -m "feat: add SVG cell layer to GridDesigner"
```

---

## Task 5: GridDesigner — wall layer

**Files:**
- Modify: `src/GridDesigner.svelte`

- [ ] **Step 1: Import `computeWalls` and add wall layer**

Replace the contents of `c:/Work/boxmaker/src/GridDesigner.svelte`:
```svelte
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
```

- [ ] **Step 2: Verify wall rendering in browser**

Expected: The 5×3 grid now shows a bold dark border around the entire outer edge. All interior lines are thin gray (ghost). If you were to hollow some cells, the boundary between hollow and solid would show as a bold line.

- [ ] **Step 3: Commit**

```bash
git add src/GridDesigner.svelte
git commit -m "feat: add wall layer to GridDesigner"
```

---

## Task 6: GridDesigner — drag interaction and preview layer

**Files:**
- Modify: `src/GridDesigner.svelte`

- [ ] **Step 1: Add full drag interaction and preview layer**

Replace the entire contents of `c:/Work/boxmaker/src/GridDesigner.svelte`:
```svelte
<script>
  import { computeWalls } from './grid.js'

  const CELL_SIZE = 40

  let { cells, mode, oncommit } = $props()

  const rows = $derived(cells.length)
  const cols = $derived(cells[0]?.length ?? 0)
  const svgWidth = $derived(cols * CELL_SIZE)
  const svgHeight = $derived(rows * CELL_SIZE)
  const walls = $derived(computeWalls(cells, CELL_SIZE))

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

  function handleMousedown(e) {
    if (e.button !== 0) return
    const cell = pointerToCell(e)
    dragStart = cell
    dragEnd = cell
  }

  function handleMousemove(e) {
    if (!dragStart) return
    dragEnd = pointerToCell(e)
  }

  function handleMouseup(e) {
    if (!dragStart || !selection) return
    oncommit(selection)
    dragStart = null
    dragEnd = null
  }

  function handleMouseleave() {
    dragStart = null
    dragEnd = null
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
  width={svgWidth}
  height={svgHeight}
  onmousedown={handleMousedown}
  onmousemove={handleMousemove}
  onmouseup={handleMouseup}
  onmouseleave={handleMouseleave}
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
```

- [ ] **Step 2: Smoke-test in browser — hollow operation**

In the browser at `http://localhost:5173`:
1. Ensure "Hollow" mode is active (blue button).
2. Click and drag across a rectangle of cells — you should see a translucent blue dashed overlay while dragging.
3. Release — the dragged cells turn solid blue (hollow).
4. Bold wall lines should appear at the boundary between the now-hollow cells and the remaining gray (solid) cells.

- [ ] **Step 3: Smoke-test fill, undo, and resize**

1. Switch to "Fill" mode. Drag over some hollow cells — they turn gray again. Wall lines update accordingly.
2. Click "Undo" — last operation reverts. Click again to undo further. Undo button disables when history is empty.
3. Change Cols to `8` — grid resets to 8×3 all-solid. History clears (Undo disabled).

- [ ] **Step 4: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/GridDesigner.svelte
git commit -m "feat: add drag interaction and preview layer to GridDesigner"
```
