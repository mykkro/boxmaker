# Box Designer — Design Spec

**Date:** 2026-06-11  
**Scope:** Phase 1 — Grid-based compartment designer (Svelte web app)  
**Out of scope:** Physical dimensions, wall thickness, box height, STL generation, 3D preview (later phases)

---

## Overview

A single-page Svelte web app that lets the user design the top-down layout of a 3D-printable box. The box is a rectangular cuboid; each "hole" is a compartment carved downward through the box. The designer works on a logical grid — no physical dimensions needed at this stage.

---

## Data Model

```ts
cols: number          // grid width
rows: number          // grid height
cells: boolean[][]    // [row][col], true = solid, false = hollow
mode: 'hollow' | 'fill'
history: boolean[][][] // stack of past cells snapshots (for undo)
```

**Drag state** (transient, owned by `GridDesigner` internally — never in App state or history):
```ts
dragStart: { col: number, row: number } | null
dragEnd:   { col: number, row: number } | null
```

The active selection rectangle is derived inside GridDesigner:
```ts
minCol = Math.min(dragStart.col, dragEnd.col)
maxCol = Math.max(dragStart.col, dragEnd.col)
minRow = Math.min(dragStart.row, dragEnd.row)
maxRow = Math.max(dragStart.row, dragEnd.row)
```

**Initial state:** all cells solid (`true`), default grid 5×3.

**Grid resize:** changing rows or cols resets `cells` to all-solid and clears `history`.

---

## Components

### `App.svelte`
Root component. Owns all state. Wires Sidebar events to state mutations and passes props down to GridDesigner.

### `Sidebar.svelte`
Dark left sidebar. Contains:
- App title ("BoxMaker")
- Grid size inputs: Cols (number input), Rows (number input)
- Mode toggle: **Hollow** button / **Fill** button (active one highlighted blue)
- Undo button (disabled when history is empty)

Emits events upward to App: `setMode`, `setSize`, `undo`.

### `GridDesigner.svelte`
The SVG grid. Receives `cells` and `mode` as props; owns drag state (`dragStart`/`dragEnd`) internally as it is ephemeral UI state App never needs to observe.

**Props:** `cells`, `mode`  
**Events:** `commit({ minCol, minRow, maxCol, maxRow })` — fired on mouseup with the committed selection rectangle

---

## SVG Rendering

Cell size: `CELL_SIZE = 40` (px, constant).  
SVG dimensions: `width = cols * CELL_SIZE`, `height = rows * CELL_SIZE`.

Three layers rendered in order:

### 1. Cell layer
One `<rect>` per cell, positioned at `(col * CELL_SIZE, row * CELL_SIZE)`, size `CELL_SIZE × CELL_SIZE`.
- Solid cell: fill `#d0d0d0`
- Hollow cell: fill `#3a7bd5`

### 2. Wall layer
`<line>` segments drawn on every edge between two cells (or cell and outside) where the states differ, plus all outer boundary edges.

- **Wall line** (hollow↔solid boundary, or outer edge): `stroke #333`, `stroke-width 3`
- **Ghost line** (same-state interior edge): `stroke #ccc`, `stroke-width 0.5`

Algorithm: iterate all horizontal and vertical edges; for each edge determine the two adjacent states (cells outside the grid are treated as "not hollow", i.e. not-hollow = solid-side for boundary detection purposes — the outer edge is always a wall).

### 3. Drag preview layer
A single `<rect>` visible only while `dragStart !== null`:
- Position: `(minCol * CELL_SIZE, minRow * CELL_SIZE)`
- Size: `(maxCol - minCol + 1) * CELL_SIZE × (maxRow - minRow + 1) * CELL_SIZE`
- Fill: `rgba(58, 123, 213, 0.25)`, stroke `#3a7bd5`, `stroke-dasharray: 5 3`

---

## Interaction Flow

All mouse events are on the SVG element.

| Event | Action |
|---|---|
| `mousedown` | Record `dragStart` and `dragEnd` from pointer position |
| `mousemove` (button held) | Update `dragEnd`; preview rect redraws reactively |
| `mouseup` (on SVG) | Commit: push current `cells` to `history`, apply mode to selection, clear drag state |
| `mouseleave` (SVG) | Cancel drag (clear drag state, no commit) |

**Commit logic:**
- `hollow` mode → set all cells in selection to `false`
- `fill` mode → set all cells in selection to `true`

**Undo:** pop `history` stack, replace `cells`. Button disabled when stack is empty.

---

## UI Layout

```
┌────────────┬──────────────────────────────────┐
│  Sidebar   │                                  │
│  (dark)    │         SVG Grid                 │
│            │                                  │
│  BoxMaker  │   (centered, fills space)        │
│  ────────  │                                  │
│  GRID SIZE │                                  │
│  Cols: [5] │                                  │
│  Rows: [3] │                                  │
│  ────────  │                                  │
│  MODE      │                                  │
│ [Hollow]   │                                  │
│  Fill      │                                  │
│  ────────  │                                  │
│  [Undo]    │                                  │
└────────────┴──────────────────────────────────┘
```

Sidebar width: ~120px, fixed. Grid area: fills remainder, grid SVG centered within it.

---

## Tech Stack

- **Svelte** (no SvelteKit needed — single HTML page, Vite dev server)
- No external UI libraries
- No state management library (plain Svelte reactivity)

---

## Out of Scope (Phase 1)

- Physical dimensions (cell size in mm, box height, wall thickness)
- STL generation
- 3D preview
- Saving / loading designs
- Multiple compartment colors / labels
