# Compartment Mode — Design Spec

**Date:** 2026-06-11  
**Scope:** Add a third "Compartment" mode to the box designer that hollows a dragged region and explicitly marks its border edges as walls, so adjacent hollow regions are still separated by visible walls.

---

## Overview

The existing Hollow and Fill modes operate purely on cell state (`boolean[][]`). Walls are derived from cell-state differences at render time, so two adjacent hollow regions have no wall between them.

The new Compartment mode also hollows cells but additionally marks the four border edges of the dragged rectangle as explicit walls. These explicit walls render as thick lines regardless of the states of neighbouring cells.

---

## Data Model Changes

### New field in App state

```ts
walls: Set<string>   // explicit wall edges; reset on grid resize
```

**Edge key format:**
- `"h:r:c"` — horizontal segment on top of row `r`, column `c`
- `"v:r:c"` — vertical segment on left of column `c`, row `r`

### Updated history

History snapshots change from `boolean[][][]` to `{cells: boolean[][], walls: Set<string>}[]`.

```ts
history: { cells: boolean[][], walls: Set<string> }[]
```

---

## Compartment Mode Behavior

When the user releases a drag in **Compartment** mode:

1. Selected cells → hollow (identical to Hollow mode)
2. All border edges of the selection are added to `walls`:
   - Top:    `"h:minRow:c"`   for `c` in `[minCol .. maxCol]`
   - Bottom: `"h:(maxRow+1):c"` for `c` in `[minCol .. maxCol]`
   - Left:   `"v:r:minCol"`   for `r` in `[minRow .. maxRow]`
   - Right:  `"v:r:(maxCol+1)"` for `r` in `[minRow .. maxRow]`

**Fill mode** additionally removes explicit wall edges that fall within or on the border of the filled selection:
- Remove `"h:r:c"` for `r` in `[minRow .. maxRow+1]`, `c` in `[minCol .. maxCol]`
- Remove `"v:r:c"` for `r` in `[minRow .. maxRow]`, `c` in `[minCol .. maxCol+1]`

**Hollow mode** leaves `walls` unchanged.

**Grid resize** resets both `cells` and `walls`.

---

## Wall Rendering

`computeWalls(cells, cellSize, explicitWalls)` gains a third parameter (defaults to `new Set()`).

An edge is classified as `'wall'` if:
- it was already a wall (outer boundary or hollow↔solid cell boundary), **OR**
- its key is in `explicitWalls`

Otherwise it is `'ghost'`.

New pure helper in `grid.js`:

```js
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
```

---

## Component Changes

### `src/grid.js`
- Update `computeWalls(cells, cellSize, explicitWalls = new Set())` — add `explicitWalls.has(key)` check
- Add `compartmentEdges(selection)` pure helper
- Add tests for both changes

### `src/App.svelte`
- Add `let walls = $state(new Set())`
- History type: `{ cells, walls }[]` — snapshot and restore both
- `handleCommit` branches on mode:
  - `'hollow'` → apply cells only (unchanged)
  - `'compartment'` → apply cells + union `compartmentEdges(selection)` into `walls`
  - `'fill'` → apply cells + remove explicit edges inside selection from `walls`
- `handleSetSize` → reset `walls = new Set()` alongside `cells`
- Pass `walls` to `<GridDesigner>`

### `src/Sidebar.svelte`
- Add `⊞ Compartment` button to MODE section
- Receive updated `mode` prop (now `'hollow' | 'fill' | 'compartment'`)

### `src/GridDesigner.svelte`
- Add `walls` to `$props()`
- Pass to `computeWalls(cells, CELL_SIZE, walls)`

---

## Out of Scope

- Deleting individual explicit wall edges (beyond fill-mode clearing)
- Labelling or colouring individual compartments
- Any visual distinction between "hollow from Hollow mode" vs "hollow from Compartment mode"
