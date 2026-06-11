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

  function resetView() {
    positionCamera()
  }
</script>

<canvas bind:this={canvas}></canvas>
<button class="stl-btn" onclick={downloadSTL}>⬇ Download STL</button>
<button class="reset-btn" onclick={resetView}>⟳ Reset View</button>

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
  .reset-btn {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #333;
    border: 1px solid #555;
    border-radius: 3px;
    color: white;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .reset-btn:hover {
    background: #444;
  }
</style>
