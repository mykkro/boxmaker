# 3D Preview & STL Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live Three.js 3D preview pane below the grid designer, plus a "Download STL" button.

**Architecture:** A pure `buildBoxParts` function produces the box geometry as a list of cuboid descriptors (no Three.js needed, fully testable). A thin `buildGeometry` wrapper converts those descriptors to a merged Three.js `BufferGeometry`. `BoxPreview3D.svelte` owns the Three.js scene and updates the mesh reactively via `$effect` whenever grid state or dimension params change.

**Tech Stack:** Svelte 5, Three.js (`three` npm package), Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/boxGeometry.js` | Create | `buildBoxParts` (pure, testable) + `buildGeometry` (Three.js wrapper) |
| `src/boxGeometry.test.js` | Create | Unit tests for `buildBoxParts` |
| `src/BoxPreview3D.svelte` | Create | Three.js canvas, orbit controls, STL export button |
| `src/App.svelte` | Modify | Add 5 dimension params to state; split layout into grid-pane / preview-pane |
| `src/Sidebar.svelte` | Modify | New DIMENSIONS section with number inputs |

---

## Coordinate System Convention

Our logical geometry (used throughout this plan):
- **X** = columns (left → right)
- **Y** = rows (front → back)
- **Z** = height (bottom → top)

Three.js is Y-up. The mapping applied in `buildGeometry`:
- `threeX = logX`, `threeY = logZ`, `threeZ = logY`
- `new THREE.BoxGeometry(size[0], size[2], size[1])` — (threeWidth, threeHeight, threeDepth)
- `geo.translate(center[0], center[2], center[1])`

---

## Task 1: Install three

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install three
```

Expected output: `added N packages` with `three` appearing in `package.json` dependencies.

- [ ] **Step 2: Verify it resolved**

```bash
npm ls three
```

Expected: `three@x.x.x` listed without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add three.js dependency"
```

---

## Task 2: `buildBoxParts` — bottom plate + outer walls (TDD)

**Files:**
- Create: `src/boxGeometry.test.js`
- Create: `src/boxGeometry.js`

- [ ] **Step 1: Write the failing tests**

Create `src/boxGeometry.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildBoxParts } from './boxGeometry.js'

// Shared params for all tests
// 1×1 grid → totalW = 1*10 + 2*4 = 18, totalD = 1*10 + 2*4 = 18
const P = { cellSize: 10, boxHeight: 20, wallThickness: 2, bottomThickness: 3, outerWallThickness: 4 }

describe('buildBoxParts — bottom plate', () => {
  it('produces bottom plate as parts[0]', () => {
    const parts = buildBoxParts([[false]], new Set(), P)
    expect(parts[0]).toEqual({ center: [9, 9, 1.5], size: [18, 18, 3] })
  })
})

describe('buildBoxParts — outer walls', () => {
  it('produces 4 outer walls as parts[1..4]', () => {
    const parts = buildBoxParts([[false]], new Set(), P)
    expect(parts[1]).toEqual({ center: [2,  9, 10], size: [4,  18, 20] }) // left
    expect(parts[2]).toEqual({ center: [16, 9, 10], size: [4,  18, 20] }) // right
    expect(parts[3]).toEqual({ center: [9,  2, 10], size: [10, 4,  20] }) // front
    expect(parts[4]).toEqual({ center: [9, 16, 10], size: [10, 4,  20] }) // back
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `buildBoxParts is not a function` or `Cannot find module './boxGeometry.js'`

- [ ] **Step 3: Implement `buildBoxParts` (bottom plate + outer walls only)**

Create `src/boxGeometry.js`:

```js
export function buildBoxParts(cells, walls, params) {
  const { cellSize, boxHeight, wallThickness, bottomThickness, outerWallThickness: owt } = params
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const totalW = cols * cellSize + 2 * owt
  const totalD = rows * cellSize + 2 * owt
  const innerH = boxHeight - bottomThickness

  const parts = []

  // Bottom plate
  parts.push({ center: [totalW / 2, totalD / 2, bottomThickness / 2], size: [totalW, totalD, bottomThickness] })

  // Outer walls
  parts.push({ center: [owt / 2,          totalD / 2,       boxHeight / 2], size: [owt,              totalD, boxHeight] }) // left
  parts.push({ center: [totalW - owt / 2, totalD / 2,       boxHeight / 2], size: [owt,              totalD, boxHeight] }) // right
  parts.push({ center: [totalW / 2,       owt / 2,          boxHeight / 2], size: [totalW - 2 * owt, owt,    boxHeight] }) // front
  parts.push({ center: [totalW / 2,       totalD - owt / 2, boxHeight / 2], size: [totalW - 2 * owt, owt,    boxHeight] }) // back

  return parts
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests in `boxGeometry.test.js` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/boxGeometry.js src/boxGeometry.test.js
git commit -m "feat: add buildBoxParts with bottom plate and outer walls"
```

---

## Task 3: `buildBoxParts` — solid cell blocks (TDD)

**Files:**
- Modify: `src/boxGeometry.test.js`
- Modify: `src/boxGeometry.js`

- [ ] **Step 1: Add failing tests**

Append to `src/boxGeometry.test.js`:

```js
describe('buildBoxParts — solid cell blocks', () => {
  it('generates no extra part for a hollow cell', () => {
    const parts = buildBoxParts([[false]], new Set(), P)
    expect(parts).toHaveLength(5) // bottom + 4 outer walls
  })

  it('generates one solid block for a solid cell in a 1×1 grid', () => {
    // block z: bottomThickness(3) to boxHeight(20) → height = 17, center z = 3 + 8.5 = 11.5
    const parts = buildBoxParts([[true]], new Set(), P)
    expect(parts).toHaveLength(6)
    expect(parts[5]).toEqual({ center: [9, 9, 11.5], size: [10, 10, 17] })
  })

  it('only generates a block for the solid cell in a mixed 1×2 grid', () => {
    // cells[0][0]=true at col 0: center x = owt + 0*cellSize + cellSize/2 = 4+5 = 9
    const parts = buildBoxParts([[true, false]], new Set(), P)
    expect(parts).toHaveLength(6) // bottom + 4 outer + 1 solid block
    expect(parts[5]).toEqual({ center: [9, 9, 11.5], size: [10, 10, 17] })
  })
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npm test
```

Expected: the 3 new solid-cell tests FAIL (previous tests still pass).

- [ ] **Step 3: Add solid cell block generation to `buildBoxParts`**

In `src/boxGeometry.js`, add this block after the outer walls push calls, before `return parts`:

```js
  // Solid cell blocks
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c]) {
        parts.push({
          center: [
            owt + c * cellSize + cellSize / 2,
            owt + r * cellSize + cellSize / 2,
            bottomThickness + innerH / 2
          ],
          size: [cellSize, cellSize, innerH]
        })
      }
    }
  }
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/boxGeometry.js src/boxGeometry.test.js
git commit -m "feat: add solid cell block generation to buildBoxParts"
```

---

## Task 4: `buildBoxParts` — explicit inner walls (TDD)

**Files:**
- Modify: `src/boxGeometry.test.js`
- Modify: `src/boxGeometry.js`

- [ ] **Step 1: Add failing tests**

Append to `src/boxGeometry.test.js`:

```js
describe('buildBoxParts — explicit inner walls', () => {
  it('adds a vertical wall between two hollow cells', () => {
    // v:0:1 — column boundary at c=1, between cells[0][0] and cells[0][1]
    // center x = owt + c*cellSize = 4 + 10 = 14
    // center y = owt + r*cellSize + cellSize/2 = 4 + 0 + 5 = 9
    // center z = bottomThickness + innerH/2 = 3 + 8.5 = 11.5
    const parts = buildBoxParts([[false, false]], new Set(['v:0:1']), P)
    expect(parts).toHaveLength(6) // bottom + 4 outer + 1 inner wall
    expect(parts[5]).toEqual({ center: [14, 9, 11.5], size: [2, 10, 17] })
  })

  it('adds a horizontal wall between two hollow cells', () => {
    // h:1:0 — row boundary at r=1, between cells[0][0] and cells[1][0]
    // center x = owt + c*cellSize + cellSize/2 = 4 + 0 + 5 = 9
    // center y = owt + r*cellSize = 4 + 10 = 14
    // center z = 3 + 8.5 = 11.5
    const parts = buildBoxParts([[false], [false]], new Set(['h:1:0']), P)
    expect(parts).toHaveLength(6)
    expect(parts[5]).toEqual({ center: [9, 14, 11.5], size: [10, 2, 17] })
  })

  it('skips outer boundary wall keys', () => {
    // All 4 boundary keys for a 1×1 grid: r=0, r=rows=1, c=0, c=cols=1
    const walls = new Set(['h:0:0', 'h:1:0', 'v:0:0', 'v:0:1'])
    const parts = buildBoxParts([[false]], walls, P)
    expect(parts).toHaveLength(5) // no inner walls added
  })

  it('skips a vertical wall when one adjacent cell is solid', () => {
    // cells[0][0]=true (solid), cells[0][1]=false; wall v:0:1 present
    // solid cell provides the wall — no extra geometry needed
    const parts = buildBoxParts([[true, false]], new Set(['v:0:1']), P)
    expect(parts).toHaveLength(6) // bottom + 4 outer + 1 solid block (no inner wall)
  })
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npm test
```

Expected: the 4 new inner-wall tests FAIL.

- [ ] **Step 3: Add explicit inner wall generation to `buildBoxParts`**

In `src/boxGeometry.js`, add this block after the solid cell block loop, before `return parts`:

```js
  // Explicit inner walls (from compartment mode)
  for (const key of walls) {
    if (key.startsWith('h:')) {
      const [, r, c] = key.split(':').map(Number)
      if (r > 0 && r < rows && cells[r - 1][c] === false && cells[r][c] === false) {
        parts.push({
          center: [owt + c * cellSize + cellSize / 2, owt + r * cellSize, bottomThickness + innerH / 2],
          size: [cellSize, wallThickness, innerH]
        })
      }
    } else if (key.startsWith('v:')) {
      const [, r, c] = key.split(':').map(Number)
      if (c > 0 && c < cols && cells[r][c - 1] === false && cells[r][c] === false) {
        parts.push({
          center: [owt + c * cellSize, owt + r * cellSize + cellSize / 2, bottomThickness + innerH / 2],
          size: [wallThickness, cellSize, innerH]
        })
      }
    }
  }
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/boxGeometry.js src/boxGeometry.test.js
git commit -m "feat: add explicit inner wall generation to buildBoxParts"
```

---

## Task 5: `buildGeometry` — Three.js wrapper

**Files:**
- Modify: `src/boxGeometry.js`

No unit test — `buildGeometry` is a thin wrapper that calls `buildBoxParts` (already tested) and applies a coordinate swap. Verified visually via the app in Task 8.

- [ ] **Step 1: Add Three.js imports to top of `src/boxGeometry.js`**

Add these two lines at the very top of the file, before the `export function buildBoxParts` line:

```js
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
```

- [ ] **Step 2: Add `buildGeometry` export at the bottom of `src/boxGeometry.js`**

Append after the existing `buildBoxParts` function:

```js
export function buildGeometry(cells, walls, params) {
  const parts = buildBoxParts(cells, walls, params)
  // Three.js is Y-up: map logical (X, Y=rows, Z=height) → three (X, Y=height, Z=rows)
  const geometries = parts.map(({ center, size }) => {
    const geo = new THREE.BoxGeometry(size[0], size[2], size[1])
    geo.translate(center[0], center[2], center[1])
    return geo
  })
  const merged = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  return merged
}
```

- [ ] **Step 3: Run existing tests to confirm they still pass**

```bash
npm test
```

Expected: All tests PASS (Three.js imports don't affect the pure `buildBoxParts` tests).

- [ ] **Step 4: Commit**

```bash
git add src/boxGeometry.js
git commit -m "feat: add buildGeometry Three.js wrapper"
```

---

## Task 6: `App.svelte` — layout split + dimension state

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Replace `src/App.svelte` with the updated version**

```svelte
<script>
  import Sidebar from './Sidebar.svelte'
  import GridDesigner from './GridDesigner.svelte'
  import BoxPreview3D from './BoxPreview3D.svelte'
  import { makeCells, applyOperation, compartmentEdges } from './grid.js'

  let cols = $state(5)
  let rows = $state(3)
  let cells = $state(makeCells(rows, cols))
  let walls = $state(new Set())
  let mode = $state('hollow')
  let history = $state([])

  let cellSize = $state(20)
  let boxHeight = $state(30)
  let wallThickness = $state(1.5)
  let bottomThickness = $state(2)
  let outerWallThickness = $state(3)

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
    onsetsize={handleSetSize}
    onsetmode={handleSetMode}
    onundo={handleUndo}
    onsetdimensions={handleSetDimensions}
  />
  <div class="workspace">
    <div class="grid-pane">
      <GridDesigner {cells} {mode} {walls} oncommit={handleCommit} />
    </div>
    <div class="preview-pane">
      <BoxPreview3D
        {cells}
        {walls}
        {cellSize}
        {boxHeight}
        {wallThickness}
        {bottomThickness}
        {outerWallThickness}
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
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 24px;
    min-height: 0;
  }
  .preview-pane {
    height: 320px;
    flex-shrink: 0;
    border-top: 2px solid #444;
    background: #1a1a1a;
    position: relative;
  }
</style>
```

Note: `BoxPreview3D` doesn't exist yet — the dev server will show a compile error until Task 8 is done. That's fine; don't run `npm run dev` until after Task 8.

- [ ] **Step 2: Run tests to confirm existing tests still pass**

```bash
npm test
```

Expected: All tests PASS (App.svelte changes don't affect unit tests).

- [ ] **Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat: add dimension state and split layout to App"
```

---

## Task 7: `Sidebar.svelte` — DIMENSIONS section

**Files:**
- Modify: `src/Sidebar.svelte`

- [ ] **Step 1: Replace `src/Sidebar.svelte` with the updated version**

```svelte
<script>
  let {
    cols, rows, mode, canUndo,
    cellSize, boxHeight, wallThickness, bottomThickness, outerWallThickness,
    onsetsize, onsetmode, onundo, onsetdimensions
  } = $props()
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
    <span class="label">DIMENSIONS</span>
    <label>
      Cell size
      <div class="input-row">
        <input type="number" min="5" max="100" step="1" value={cellSize}
          oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 5) onsetdimensions({ cellSize: v }) }} />
        <span class="unit">mm</span>
      </div>
    </label>
    <label>
      Height
      <div class="input-row">
        <input type="number" min="5" max="200" step="1" value={boxHeight}
          oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 5) onsetdimensions({ boxHeight: v }) }} />
        <span class="unit">mm</span>
      </div>
    </label>
    <label>
      Wall thick
      <div class="input-row">
        <input type="number" min="0.5" max="10" step="0.5" value={wallThickness}
          oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 0.5) onsetdimensions({ wallThickness: v }) }} />
        <span class="unit">mm</span>
      </div>
    </label>
    <label>
      Bottom
      <div class="input-row">
        <input type="number" min="0.5" max="20" step="0.5" value={bottomThickness}
          oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 0.5) onsetdimensions({ bottomThickness: v }) }} />
        <span class="unit">mm</span>
      </div>
    </label>
    <label>
      Outer wall
      <div class="input-row">
        <input type="number" min="1" max="20" step="0.5" value={outerWallThickness}
          oninput={e => { const v = Number(e.target.value); if (e.target.value && v >= 1) onsetdimensions({ outerWallThickness: v }) }} />
        <span class="unit">mm</span>
      </div>
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
    <button class:active={mode === 'compartment'} onclick={() => onsetmode('compartment')}>
      ⊞ Compart.
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
    overflow-y: auto;
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
  .input-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .unit {
    font-size: 10px;
    color: #888;
    flex-shrink: 0;
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
    min-width: 0;
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

- [ ] **Step 2: Run tests to confirm they still pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/Sidebar.svelte
git commit -m "feat: add DIMENSIONS section to Sidebar"
```

---

## Task 8: `BoxPreview3D.svelte` — Three.js component + STL export

**Files:**
- Create: `src/BoxPreview3D.svelte`

No unit test — verified manually via the dev server.

- [ ] **Step 1: Create `src/BoxPreview3D.svelte`**

```svelte
<script>
  import { onMount, onDestroy } from 'svelte'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
  import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
  import { buildGeometry } from './boxGeometry.js'

  let { cells, walls, cellSize, boxHeight, wallThickness, bottomThickness, outerWallThickness } = $props()

  let canvas
  let renderer, scene, camera, controls, mesh, animId

  onMount(() => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x1a1a1a)

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(1, 2, 1)
    scene.add(dir)

    const material = new THREE.MeshPhongMaterial({ color: 0x7a9abb, shininess: 40 })
    mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
    scene.add(mesh)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    resize()

    positionCamera()
    rebuildGeometry()

    function loop() {
      animId = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    return () => ro.disconnect()
  })

  onDestroy(() => {
    if (animId !== undefined) cancelAnimationFrame(animId)
    mesh?.geometry.dispose()
    mesh?.material.dispose()
    controls?.dispose()
    renderer?.dispose()
  })

  function resize() {
    const el = canvas.parentElement
    renderer.setSize(el.clientWidth, el.clientHeight)
    camera.aspect = el.clientWidth / el.clientHeight
    camera.updateProjectionMatrix()
  }

  function positionCamera() {
    const cols = cells[0]?.length ?? 0
    const rows = cells.length
    const totalW = cols * cellSize + 2 * outerWallThickness
    const totalD = rows * cellSize + 2 * outerWallThickness
    // Three.js Y-up: box center is at (totalW/2, boxHeight/2, totalD/2) in Three.js coords
    const cx = totalW / 2, cy = boxHeight / 2, cz = totalD / 2
    const diag = Math.sqrt(totalW ** 2 + boxHeight ** 2 + totalD ** 2)
    const dist = diag * 1.2
    camera.position.set(cx + dist * 0.6, cy + dist * 0.8, cz - dist * 0.8)
    controls.target.set(cx, cy, cz)
    controls.update()
  }

  function rebuildGeometry() {
    if (!mesh) return
    const params = { cellSize, boxHeight, wallThickness, bottomThickness, outerWallThickness }
    const geo = buildGeometry(cells, walls, params)
    mesh.geometry.dispose()
    mesh.geometry = geo
  }

  $effect(() => {
    cells; walls; cellSize; boxHeight; wallThickness; bottomThickness; outerWallThickness
    rebuildGeometry()
  })

  function downloadSTL() {
    const exporter = new STLExporter()
    const data = exporter.parse(mesh, { binary: true })
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'box.stl'
    a.click()
    URL.revokeObjectURL(a.href)
  }
</script>

<canvas bind:this={canvas}></canvas>
<button class="stl-btn" onclick={downloadSTL}>⬇ Download STL</button>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .stl-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #333;
    border: 1px solid #555;
    border-radius: 3px;
    color: white;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .stl-btn:hover {
    background: #444;
  }
</style>
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 3: Start dev server and verify manually**

```bash
npm run dev
```

Open the URL printed (usually `http://localhost:5173`). Verify:
- The app loads without console errors
- The sidebar shows GRID SIZE, DIMENSIONS, MODE, and Undo sections
- The 3D pane is visible below the grid (dark background, 320px tall)
- A blue-grey 3D box is visible and rotates with mouse drag
- Changing grid cells (hollow/fill) updates the 3D model immediately
- Changing dimension inputs (cell size, height, etc.) updates the 3D model immediately
- Clicking "⬇ Download STL" downloads a `box.stl` file
- The downloaded STL can be opened in a slicer (PrusaSlicer, Bambu Studio, etc.) and shows a correct box shape

- [ ] **Step 4: Commit**

```bash
git add src/BoxPreview3D.svelte
git commit -m "feat: add BoxPreview3D with Three.js WebGL preview and STL export"
```
