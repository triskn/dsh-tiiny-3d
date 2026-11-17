/**
 * Exercise the shipped pointer handler against the shipped rasterizer. A
 * default-camera change cannot make these pass: the visible near-side marker
 * must follow the mouse at every tested heading, in all four directions.
 * These are pixel-buffer / handler unit tests, not browser visual verification.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8')

function between(start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  assert.ok(from >= 0 && to > from, `shipped block exists: ${start}`)
  return source.slice(from, to)
}

const moveSource = between('      const onPointerMove = (event) => {', '      const onPointerUp = ')
const makeMove = new Function('view', 'requestPaint', `${moveSource}; return onPointerMove`)
const rasterSource = between('    function rasterize(', '    function paintTextured(')
const rasterize = new Function(`${rasterSource}; return rasterize`)()
const painterSource = between('    const LIGHT = ', '    function GlbPreview(')
const paint = new Function('window', `${painterSource}; return paint`)({ devicePixelRatio: 1 })

const directions = [
  { name: 'right', dx: 8, dy: 0, axis: 'x', sign: 1 },
  { name: 'left', dx: -8, dy: 0, axis: 'x', sign: -1 },
  { name: 'down', dx: 0, dy: 8, axis: 'y', sign: 1 },
  { name: 'up', dx: 0, dy: -8, axis: 'y', sign: -1 },
]
const headings = [0, Math.PI / 2, Math.PI, Math.PI - 0.45]
const pitches = [-1.3, -0.6, 0, 0.24, 1.3]

function move(state, dx, dy) {
  const requested = []
  const handler = makeMove({ current: state }, (fine) => requested.push(fine))
  handler({ clientX: state.lastX + dx, clientY: state.lastY + dy })
  return requested
}

// Rotate a camera-space patch back into model space. At the initial heading it
// sits at the centre of the visible surface (negative Z), independent of which
// side of the asset the user happened to be viewing.
function toModel(x, y, z, yaw, pitch) {
  const wy = y * Math.cos(pitch) + z * Math.sin(pitch)
  const wz = -y * Math.sin(pitch) + z * Math.cos(pitch)
  return [x * Math.cos(yaw) - wz * Math.sin(yaw), wy, x * Math.sin(yaw) + wz * Math.cos(yaw)]
}

function nearMarker(yaw, pitch) {
  const corners = [
    [-0.12, -0.12, -0.75], [0.12, -0.12, -0.75], [0.12, 0.12, -0.75],
    [-0.12, -0.12, -0.75], [0.12, 0.12, -0.75], [-0.12, 0.12, -0.75],
  ]
  return {
    positions: Float32Array.from(corners.flatMap((p) => toModel(...p, yaw, pitch))),
    uvs: new Float32Array(12).fill(0.25),
    texture: { data: new Uint8ClampedArray([240, 30, 30, 255]), size: 1 },
    center: [0, 0, 0], radius: 1, count: 2,
  }
}

function redCentroid(pixels, width) {
  let x = 0, y = 0, count = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > pixels[i + 1] * 2 && pixels[i] > pixels[i + 2] * 2) {
      const index = i / 4
      x += index % width
      y += Math.floor(index / width)
      count += 1
    }
  }
  assert.ok(count > 100, 'the near-side marker is visible')
  return { x: x / count, y: y / count }
}

for (const direction of directions) {
  test(`mouse drag ${direction.name}: the visible textured surface follows the pointer`, () => {
    for (const yaw of headings) {
      for (const pitch of pitches) {
        const view = { yaw, pitch, zoom: 1, dragging: true, lastX: 100, lastY: 100 }
        const model = nearMarker(yaw, pitch)
        const before = redCentroid(rasterize(model, view, 160, 160), 160)
        assert.deepEqual(move(view, direction.dx, direction.dy), [false], 'request one interactive paint')
        const after = redCentroid(rasterize(model, view, 160, 160), 160)
        assert.ok(
          (after[direction.axis] - before[direction.axis]) * direction.sign > 0.5,
          `${direction.name} at yaw=${yaw}, pitch=${pitch}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
        )
      }
    }
  })
}

test('equal reverse drags restore the orientation and preserve zoom', () => {
  const view = { yaw: 2.3, pitch: 0.24, zoom: 1.75, dragging: true, lastX: 42, lastY: 81 }
  move(view, 30, -20)
  move(view, -30, 20)
  assert.ok(Math.abs(view.yaw - 2.3) < 1e-12)
  assert.ok(Math.abs(view.pitch - 0.24) < 1e-12)
  assert.equal(view.zoom, 1.75)
  assert.equal(view.lastX, 42)
  assert.equal(view.lastY, 81)
})

test('upward/downward drag stops at the pitch limits without flipping over', () => {
  const view = { yaw: 1.5, pitch: 0, zoom: 1, dragging: true, lastX: 0, lastY: 0 }
  move(view, 0, -10000)
  assert.equal(view.pitch, 1.45)
  move(view, 0, 20000)
  assert.equal(view.pitch, -1.45)
  assert.equal(view.yaw, 1.5)
})

test('pointer movement outside an active drag does not rotate', () => {
  const view = { yaw: 1, pitch: 0.2, dragging: false, lastX: 0, lastY: 0 }
  assert.deepEqual(move(view, 20, 30), [])
  assert.equal(view.yaw, 1)
  assert.equal(view.pitch, 0.2)
})

function overlapModel(reverse = false) {
  const near = [-0.2, -0.2, -0.5, 0.2, -0.2, -0.5, 0, 0.2, -0.5]
  const far = [-0.2, -0.2, 0.5, 0.2, -0.2, 0.5, 0, 0.2, 0.5]
  return {
    positions: Float32Array.from(reverse ? [...near, ...far] : [...far, ...near]),
    colors: Float32Array.from(reverse ? [0, 0, 1, 1, 0, 0] : [1, 0, 0, 0, 0, 1]),
    // A two-pixel atlas: red for the far face, blue for the near one.
    uvs: Float32Array.from(reverse
      ? [0.75, 0.25, 0.75, 0.25, 0.75, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25]
      : [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.75, 0.25, 0.75, 0.25, 0.75, 0.25]),
    texture: { data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255]), size: 2 },
    center: [0, 0, 0], radius: 1, count: 2,
  }
}

test('the textured z-buffer shows negative-Z in front, independent of triangle order', () => {
  for (const reverse of [false, true]) {
    const pixels = rasterize(overlapModel(reverse), { yaw: 0, pitch: 0, zoom: 1 }, 160, 160)
    const at = (80 * 160 + 80) * 4
    assert.equal(pixels[at], 0, 'far red face is occluded')
    assert.ok(pixels[at + 2] > 150, 'near blue face is visible')
  }
})

for (const points of [false, true]) {
  test(`${points ? 'point cloud' : 'untextured painter'} uses the same near side as the textured z-buffer`, () => {
    for (const reverse of [false, true]) {
      const drawn = []
      // Instrument draw calls only: no DOM, page emulation or screenshot.
      const context = {
        setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {},
        fill() { drawn.push(this.fillStyle) },
        fillRect() { drawn.push(this.fillStyle) },
      }
      const canvas = { width: 160, height: 160, clientWidth: 160, clientHeight: 160, getContext: () => context }
      const model = overlapModel(reverse)
      model.texture = null
      paint(canvas, model, { yaw: 0, pitch: 0, zoom: 1, points })
      assert.equal(drawn.length, 2)
      assert.match(drawn.at(-1), /^rgb\(0,0,[1-9][0-9]*\)$/, 'negative-Z blue face draws last, not the far red one')
    }
  })
}
