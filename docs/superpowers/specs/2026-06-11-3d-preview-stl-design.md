# 3D Preview & STL Generation — Design Spec

**Date:** 2026-06-11
**Scope:** Phase 2 — Live 3D WebGL preview + STL export for the box designer

---

## Overview

Add a live 3D preview pane below the existing 2D grid designer. The preview renders the physical box (including outer walls, bottom plate, solid-cell blocks, and compartment divider walls) using Three.js with orbit camera controls. A "Download STL" button exports the model as a binary STL file.

The 3D model updates reactively whenever the grid state or any dimension parameter changes — no manual refresh needed.

---

## Parameters

Five physical dimension parameters are added to the app state (all in mm):

| Parameter | Default | Description |
|---|---|---|
| `cellSize` | 20 | Size of one grid cell (square) |
| `boxHeight` | 30 | Total external height of the box |
| `wallThickness` | 1.5 | Thickness of internal compartment dividers |
| `bottomThickness` | 2 | Thickness of the bottom plate |
| `outerWallThickness` | 3 | Thickness of the four outer walls |

Parameters live in `App.svelte` state, passed as props to both `Sidebar.svelte` (inputs) and `BoxPreview3D.svelte` (geometry).

---

## Architecture

### New files

**`src/boxGeometry.js`**
Pure function — no Three.js side effects, no rendering:
```js
buildGeometry(cells, walls, params) → THREE.BufferGeometry
```
Takes current grid state and dimension params. Returns a single merged `BufferGeometry` ready to assign to a mesh. Separated from the component so it can be unit-tested independently.

**`src/BoxPreview3D.svelte`**
Three.js canvas component. Owns the renderer, scene, camera, and OrbitControls. Uses a `$effect` to call `buildGeometry` whenever inputs change and swaps the mesh geometry. Contains the STL export button.

### Modified files

**`src/App.svelte`**
- Add 5 dimension params to `$state`
- Change main area layout from a single grid pane to a vertical split (grid on top, 3D preview below)
- Pass params to Sidebar and BoxPreview3D

**`src/Sidebar.svelte`**
- Add a new "DIMENSIONS" section with number inputs for all 5 params

### New dependency

`three` (npm) — provides renderer, geometry, controls, and STL exporter.

---

## Geometry Model

### Coordinate system (logical)

- **X** — columns, left → right
- **Y** — rows, front → back
- **Z** — height, bottom → top

Three.js is Y-up. The implementation should map logical Z (height) → Three.js Y, and logical Y (rows) → Three.js Z. All position and size values in this spec are in the logical coordinate system; swap accordingly when constructing Three.js objects.

### Derived dimensions

```
totalW = cols × cellSize + 2 × outerWallThickness
totalD = rows × cellSize + 2 × outerWallThickness
```

### Geometry pieces (all merged into one BufferGeometry)

**1. Bottom plate**
- Size: `totalW × totalD × bottomThickness`
- Position: centered at `(totalW/2, totalD/2, bottomThickness/2)`

**2. Outer walls (4 pieces)**
- Left: `(owt, totalD, boxHeight)` at `(owt/2, totalD/2, boxHeight/2)`
- Right: `(owt, totalD, boxHeight)` at `(totalW − owt/2, totalD/2, boxHeight/2)`
- Front: `(totalW − 2×owt, owt, boxHeight)` at `(totalW/2, owt/2, boxHeight/2)`
- Back: `(totalW − 2×owt, owt, boxHeight)` at `(totalW/2, totalD − owt/2, boxHeight/2)`

Where `owt = outerWallThickness`.

**3. Solid cell blocks**
For each `cells[r][c] === true`:
- Size: `(cellSize, cellSize, boxHeight − bottomThickness)`
- Position center: `(owt + c×cellSize + cellSize/2, owt + r×cellSize + cellSize/2, bottomThickness + (boxHeight−bottomThickness)/2)`
- Rises from the top of the bottom plate to the full box height (flush with the rim)

**4. Explicit inner walls** (from the `walls` Set)
Only added where both adjacent cells are hollow (solid cells already provide the wall mass).
Outer boundary wall keys are skipped (covered by outer wall geometry).

For `h:r:c` (horizontal — spans column c at row boundary r):
- Only processed when `0 < r < rows` (boundary edges excluded)
- Both cells hollow: `cells[r-1][c] === false && cells[r][c] === false`
- Size: `(cellSize, wallThickness, boxHeight − bottomThickness)`
- Center: `(owt + c×cellSize + cellSize/2, owt + r×cellSize, bottomThickness + (boxHeight−bottomThickness)/2)`

For `v:r:c` (vertical — spans row r at column boundary c):
- Only processed when `0 < c < cols` (boundary edges excluded)
- Both cells hollow: `cells[r][c-1] === false && cells[r][c] === false`
- Size: `(wallThickness, cellSize, boxHeight − bottomThickness)`
- Center: `(owt + c×cellSize, owt + r×cellSize + cellSize/2, bottomThickness + (boxHeight−bottomThickness)/2)`

All pieces merged with `BufferGeometryUtils.mergeGeometries(pieces)`.

---

## BoxPreview3D Component

### Three.js scene setup (on mount)

- `WebGLRenderer` attached to a `<canvas>` element; background `#1a1a1a`
- `PerspectiveCamera` at `fov=50`; initial position set to `(totalW × 1.2, −totalD × 1.5, boxHeight × 2)`, looking at the box center `(totalW/2, totalD/2, boxHeight/2)`
- `AmbientLight` intensity 0.5 (soft fill)
- `DirectionalLight` from `(1, −1, 2)` normalized, intensity 0.8
- `OrbitControls` with `enableDamping: true`
- One `Mesh` with `MeshPhongMaterial({ color: 0x7a9abb, shininess: 40 })`
- `ResizeObserver` on the canvas container to call `renderer.setSize` when the panel resizes

### Reactivity

A `$effect` in `BoxPreview3D` watches `cells`, `walls`, and all 5 params. On change:
1. Call `buildGeometry(cells, walls, params)`
2. Dispose the previous geometry (`mesh.geometry.dispose()`)
3. Assign the new geometry to `mesh.geometry`

Camera position is set once on first render (mount), then left alone so orbit state persists while designing.

### Render loop

`requestAnimationFrame` loop started on mount, cancelled on component destroy. Calls `controls.update()` then `renderer.render(scene, camera)` each frame.

### Cleanup

`onDestroy`: cancel animation frame, dispose renderer, geometry, material, controls.

---

## STL Export

Uses `STLExporter` from `three/examples/jsm/exporters/STLExporter`.

```js
const exporter = new STLExporter()
const data = exporter.parse(mesh, { binary: true })
const blob = new Blob([data], { type: 'application/octet-stream' })
// trigger download
const a = document.createElement('a')
a.href = URL.createObjectURL(blob)
a.download = 'box.stl'
a.click()
URL.revokeObjectURL(a.href)
```

The button is overlaid in the top-right of the 3D panel (`position: absolute`, styled to match existing sidebar buttons).

---

## Layout

```
┌──────────┬──────────────────────────────┐
│          │   SVG Grid (flex: 1, scroll) │
│ Sidebar  ├──────────────────────────────┤
│          │   3D Preview (320px fixed)   │
└──────────┴──────────────────────────────┘
```

The sidebar stays full height. The right area is a flex column:
- Grid pane: `flex: 1`, `min-height: 0`, overflow auto, grid SVG centered within
- Preview pane: `height: 320px`, `flex-shrink: 0`, dark background `#1a1a1a`, `border-top: 2px solid #444`

### Sidebar DIMENSIONS section

Inserted above the MODE section:

```
DIMENSIONS
Cell size   [20 ] mm
Height      [30 ] mm
Wall thick  [1.5] mm
Bottom      [2  ] mm
Outer wall  [3  ] mm
```

All inputs are `type="number"` with a `min` of 0.5 and `step` of 0.5, styled identically to the existing Cols/Rows inputs. The "mm" label is a small inline suffix.

---

## Out of Scope

- Resize handle between grid and 3D panes
- Multiple export formats (OBJ, STEP)
- Rounded corners or chamfers
- Lid generation
- Saving/loading dimension presets
