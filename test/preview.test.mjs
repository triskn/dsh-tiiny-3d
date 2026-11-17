/**
 * Preview parser test. The Client half is a plain browser script, so this test
 * evaluates the exact shipped GLB reader out of client.js and checks it against
 * a real (if tiny) GLB: accessor offsets, index handling, and normalization.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8')
const start = source.indexOf('const COMPONENTS = {')
const end = source.indexOf('const previewCache = new Map()')
assert.ok(start > 0 && end > start, 'GLB reader block is present in client.js')
const block = source.slice(start, end)
const factory = new Function(`${block}; return { parseGlb }`)

function buildGlb() {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const indices = new Uint16Array([0, 1, 2])
  const positionBytes = Buffer.from(positions.buffer)
  const indexBytes = Buffer.from(indices.buffer)
  const indexPad = Buffer.alloc((4 - (indexBytes.length % 4)) % 4)
  const bin = Buffer.concat([positionBytes, indexBytes, indexPad])

  const gltf = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1] } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0, mode: 4 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.length },
      { buffer: 0, byteOffset: positionBytes.length, byteLength: indexBytes.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
  }
  const json = Buffer.from(JSON.stringify(gltf))
  const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)
  const jsonChunk = Buffer.concat([json, jsonPad])
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonChunk.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin])
}

test('reads triangles, indices, and material colour from a GLB', async () => {
  const { parseGlb } = factory()
  const glb = buildGlb()
  const model = await parseGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), 9000)

  assert.equal(model.total, 1)
  assert.equal(model.count, 1)
  assert.equal(model.positions.length, 9)
  assert.deepEqual(Array.from(model.positions), [0, 0, 0, 1, 0, 0, 0, 1, 0])
  assert.ok(Math.abs(model.colors[0] - 1) < 1e-6)
  assert.equal(model.colors[1], 0)
  assert.equal(model.colors[2], 0)
  // Centered and normalized so the renderer can frame any model.
  assert.equal(model.center[0], 0.5)
  assert.equal(model.center[2], 0)
  assert.ok(model.radius > 0)
})

test('rejects files that are not GLB containers', async () => {
  const { parseGlb } = factory()
  await assert.rejects(() => parseGlb(new Uint8Array(32).buffer, 100), /GLB/)
})


/** A dense plane grid with UVs that mirror the positions, to exercise clustering. */
function buildGridGlb(cells = 40) {
  const n = cells + 1
  const positions = []
  const uvs = []
  const indices = []
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const u = x / cells
      const v = y / cells
      positions.push(u, v, 0.15 * Math.sin(u * 6) * Math.cos(v * 5))
      uvs.push(u, v)
    }
  }
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const a = y * n + x
      indices.push(a, a + 1, a + n, a + 1, a + n + 1, a + n)
    }
  }
  const posBytes = Buffer.from(new Float32Array(positions).buffer)
  const uvBytes = Buffer.from(new Float32Array(uvs).buffer)
  const idxBytes = Buffer.from(new Uint32Array(indices).buffer)
  const bin = Buffer.concat([posBytes, uvBytes, idxBytes])
  const gltf = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, mode: 4 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length },
      { buffer: 0, byteOffset: posBytes.length, byteLength: uvBytes.length },
      { buffer: 0, byteOffset: posBytes.length + uvBytes.length, byteLength: idxBytes.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: uvs.length / 2, type: 'VEC2' },
      { bufferView: 2, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
  }
  const json = Buffer.from(JSON.stringify(gltf))
  const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)
  const jsonChunk = Buffer.concat([json, jsonPad])
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonChunk.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin])
}

test('clusters a dense mesh and keeps UVs aligned with the faces', async () => {
  const { parseGlb } = factory()
  const glb = buildGridGlb(40)
  const model = await parseGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), 2000)
  assert.ok(model.total > 2000, 'the fixture is dense enough to cluster')
  assert.ok(model.count > 0 && model.count < model.total, 'faces were reduced')
  assert.equal(model.uvs.length, model.count * 6, 'one UV pair per corner')
  for (let t = 0; t < model.count; t += 1) {
    for (let v = 0; v < 3; v += 1) {
      const px = model.positions[t * 9 + v * 3]
      const py = model.positions[t * 9 + v * 3 + 1]
      const u = model.uvs[t * 6 + v * 2]
      const vv = model.uvs[t * 6 + v * 2 + 1]
      assert.ok(Number.isFinite(u) && Number.isFinite(vv), 'uvs are numbers')
      assert.ok(Math.abs(u - px) < 0.2, `u tracks x on face ${t}`)
      assert.ok(Math.abs(vv - py) < 0.2, `v tracks y on face ${t}`)
    }
  }
})

test('respects the triangle cap', async () => {
  const { parseGlb } = factory()
  const glb = buildGlb()
  const model = await parseGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), 1)
  assert.equal(model.count, 1)
  assert.equal(model.total, 1)
})
