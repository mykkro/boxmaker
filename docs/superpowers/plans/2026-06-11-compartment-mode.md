# Compartment Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "Compartment" mode that hollows a dragged region and permanently marks its border edges as walls, so adjacent hollow regions remain visually separated.

**Architecture:** A `walls: Set<string>` is added alongside `cells` in App state; edge keys like `"h:r:c"` / `"v:r:c"` identify each grid line segment. `computeWalls` gains an `explicitWalls` parameter and ORs it with cell-state-derived walls. All other logic (drag, undo, grid resize) already exists and only needs small extensions.

**Tech Stack:** Svelte 5, Vite 5, Vitest 1.

---

## File Map

| File | Change |
|---|---|
| `src/grid.js` | Add `compartmentEdges(selection)` helper; update `computeWalls` signature |
| `src/grid.test.js` | Add tests for both new behaviors |
| `src/App.svelte` | Add `walls` state; update history, `handleCommit`, `handleSetSize` |
| `src/Sidebar.svelte` | Add Compartment button to MODE section |
| `src/GridDesigner.svelte` | Add `walls` prop; rename derived to avoid collision; pass to `computeWalls` |

---

## Task 1: Update grid.js — `compartmentEdges` and `computeWalls` (TDD)

**Files:**
- Modify: `src/grid.test.js`
- Modify: `src/grid.js`

- [ ] **Step 1: Add failing tests**

Add to the end of `c:/Work/boxmaker/src/grid.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { makeCells, applyOperation, computeWalls, compartmentEdges } from './grid.js'
```

Replace the existing import line (line 1-2) with:
```js
import { describe, it, expect } from 'vitest'
import { makeCells, applyOperation, computeWalls, compartmentEdges } from './grid.js'
```

Then append to the end of the file:

```js
describe('compartmentEdges', () => {
  it('returns 4 keys for a 1x1 selection at origin', () => {
    const keys = compartmentEdges({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 })
    expect(keys.has('h:0:0')).toBe(true)  // top
    expect(keys.has('h:1:0')).toBe(true)  // bottom
    expect(keys.has('v:0:0')).toBe(true)  // left
    expect(keys.has('v:0:1')).toBe(true)  // right
    expect(keys.size).toBe(4)
  })

  it('returns 8 keys for a 2x2 selection at offset position', () => {
    const keys = compartmentEdges({ minRow: 1, maxRow: 2, minCol: 1, maxCol: 2 })
    expect(keys.has('h:1:1')).toBe(true)  // top-left
    expect(keys.has('h:1:2')).toBe(true)  // top-right
    expect(keys.has('h:3:1')).toBe(true)  // bottom-left
    expect(keys.has('h:3:2')).toBe(true)  // bottom-right
    expect(keys.has('v:1:1')).toBe(true)  // left-top
    expect(keys.has('v:2:1')).toBe(true)  // left-bottom
    expect(keys.has('v:1:3')).toBe(true)  // right-top
    expect(keys.has('v:2:3')).toBe(true)  // right-bottom
    expect(keys.size).toBe(8)
  })

  it('returns a Set (not an array)', () => {
    const keys = compartmentEdges({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 })
    expect(keys).toBeInstanceOf(Set)
  })
})

describe('computeWalls with explicitWalls', () => {
  it('defaults to no explicit walls when third arg omitted (existing behavior unchanged)', () => {
    const cells = [[false, false]]
    const edges = computeWalls(cells, 40)
    const interior = edges.find(e => e.x1 === 40 && e.x2 === 40 && e.y1 === 0 && e.y2 === 40)
    expect(interior?.type).toBe('ghost')
  })

  it('marks an explicit wall edge as wall even between two hollow cells', () => {
    const cells = [[false, false]]
    const explicitWalls = new Set(['v:0:1'])
    const edges = computeWalls(cells, 40, explicitWalls)
    const interior = edges.find(e => e.x1 === 40 && e.x2 === 40 && e.y1 === 0 && e.y2 === 40)
    expect(interior?.type).toBe('wall')
  })

  it('does not affect edges not in the explicit set', () => {
    const cells = [[false, false]]
    const explicitWalls = new Set(['v:0:1'])
    const edges = computeWalls(cells, 40, explicitWalls)
    // The top horizontal edge of col 0 is not in the set — should still be wall (outer boundary)
    const topLeft = edges.find(e => e.x1 === 0 && e.x2 === 40 && e.y1 === 0 && e.y2 === 0)
    expect(topLeft?.type).toBe('wall')
    // Interior horizontal edge (row 1, col 0) is not in set — still ghost
    const innerH = edges.find(e => e.y1 === 40 && e.y2 === 40 && e.x1 === 0 && e.x2 === 40)
    expect(innerH?.type).toBe('wall') // outer bottom edge of 1-row grid, still wall
  })
})
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
cd c:/Work/boxmaker && npm test
```

Expected: existing 10 tests still pass; new tests for `compartmentEdges` and `computeWalls with explicitWalls` FAIL with `compartmentEdges is not a function` or similar.

- [ ] **Step 3: Implement `compartmentEdges` and update `computeWalls`**

Replace the entire contents of `c:/Work/boxmaker/src/grid.js`:

```js
export function makeCells(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(true))
}

export function applyOperation(cells, { minRow, maxRow, minCol, maxCol }, mode) {
  if (mode !== 'hollow' && mode !== 'fill') throw new Error(`Unknown mode: ${mode}`)
  const value = mode === 'fill'
  return cells.map((row, r) =>
    row.map((cell, c) =>
      r >= minRow && r <= maxRow && c >= minCol && c <= maxCol ? value : cell
    )
  )
}

export function compartmentEdges({ minRow, maxRow, minCol, maxCol }) {
  const keys = new Set()
  for (let c = minCol; c <= maxCol; c++) {
    keys.add(`h:${minRow}:${c}`)
    keys.add(`h:${maxRow + 1}:${c}`)
  }
  for (let r = minRow; r <= maxRow; r++) {
    keys.add(`v:${r}:${minCol}`)
    keys.add(`v:${r}:${maxCol + 1}`)
  }
  return keys
}

export function computeWalls(cells, cellSize, explicitWalls = new Set()) {
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const edges = []

  // Horizontal edges — run along the top of each row boundary
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isOuter = r === 0 || r === rows
      const above = r > 0 ? cells[r - 1][c] : true
      const below = r < rows ? cells[r][c] : true
      const type = isOuter || above !== below || explicitWalls.has(`h:${r}:${c}`) ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: (c + 1) * cellSize, y2: r * cellSize, type })
    }
  }

  // Vertical edges — run along the left of each column boundary
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const isOuter = c === 0 || c === cols
      const left = c > 0 ? cells[r][c - 1] : true
      const right = c < cols ? cells[r][c] : true
      const type = isOuter || left !== right || explicitWalls.has(`v:${r}:${c}`) ? 'wall' : 'ghost'
      edges.push({ x1: c * cellSize, y1: r * cellSize, x2: c * cellSize, y2: (r + 1) * cellSize, type })
    }
  }

  return edges
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd c:/Work/boxmaker && npm test
```

Expected:
```
✓ src/grid.test.js (16 tests)
Test Files  1 passed (1)
Tests  16 passed (16)
```

- [ ] **Step 5: Commit**

```bash
cd c:/Work/boxmaker && git add src/grid.js src/grid.test.js && git commit -m "feat: add compartmentEdges helper and explicitWalls support to computeWalls"
```

---

## Task 2: Update App.svelte — walls state and commit logic

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Replace App.svelte with updated version**

Replace the entire contents of `c:/Work/boxmaker/src/App.svelte`:

```svelte
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
```

- [ ] **Step 2: Verify tests still pass**

```bash
cd c:/Work/boxmaker && npm test
```

Expected: 16 tests pass (no regressions — grid.js tests are independent of App.svelte).

- [ ] **Step 3: Commit**

```bash
cd c:/Work/boxmaker && git add src/App.svelte && git commit -m "feat: add walls state and compartment commit logic to App"
```

---

## Task 3: Add Compartment button to Sidebar

**Files:**
- Modify: `src/Sidebar.svelte`

- [ ] **Step 1: Add Compartment button**

In `c:/Work/boxmaker/src/Sidebar.svelte`, replace the MODE section (lines 26–34):

```svelte
  <section>
    <span class="label">MODE</span>
    <button class:active={mode === 'hollow'} onclick={() => onsetmode('hollow')}>
      ⬡ Hollow
    </button>
    <button class:active={mode === 'fill'} onclick={() => onsetmode('fill')}>
      ▦ Fill
    </button>
    <button class:active={mode === 'compartment'} onclick={() => onsetmode('compartment')}>
      ⊞ Compart.
    </button>
  </section>
```

- [ ] **Step 2: Start dev server and verify the new button appears**

```bash
cd c:/Work/boxmaker && npm run dev
```

Open `http://localhost:5173` (or the port shown). Expected: the MODE section now shows three buttons — Hollow, Fill, Compart. Clicking Compart. highlights it blue. Stop the server.

- [ ] **Step 3: Commit**

```bash
cd c:/Work/boxmaker && git add src/Sidebar.svelte && git commit -m "feat: add Compartment mode button to Sidebar"
```

---

## Task 4: Update GridDesigner — accept walls prop and pass to computeWalls

**Files:**
- Modify: `src/GridDesigner.svelte`

- [ ] **Step 1: Replace GridDesigner.svelte with updated version**

Replace the entire contents of `c:/Work/boxmaker/src/GridDesigner.svelte`:

```svelte
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
```

Note: the derived `walls` from `computeWalls` has been renamed `wallEdges` to avoid shadowing the `walls` prop.

- [ ] **Step 2: Run tests**

```bash
cd c:/Work/boxmaker && npm test
```

Expected: 16 tests pass.

- [ ] **Step 3: End-to-end smoke test in browser**

Start the dev server (`npm run dev`). Open the app. Test all three modes:

1. **Hollow mode** — drag a 2×2 region. Cells turn blue. Walls appear at hollow/solid boundary. No explicit walls added.
2. **Fill mode** — fill the same region back. Cells turn gray. Any explicit walls inside the region are removed.
3. **Compartment mode** — drag a 2×2 region in a fresh area. Cells turn blue AND a thick border appears around the entire rectangle. Then drag an adjacent 2×2 compartment right next to it — the shared edge should show a thick wall between the two hollow regions.
4. **Undo** — undo several times. Each step restores both cells and walls correctly.
5. **Resize** — change Cols to 8. Grid resets to all-solid with no explicit walls.

Stop the server.

- [ ] **Step 4: Commit**

```bash
cd c:/Work/boxmaker && git add src/GridDesigner.svelte && git commit -m "feat: wire walls prop to GridDesigner for compartment border rendering"
```
