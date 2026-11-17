/** Pure helper regressions for the English/layout review; no real device calls. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8')
const start = source.indexOf('    function historyFileUrl(')
const end = source.indexOf('    function readFileAsDataUrl(', start)
assert.ok(start > 0 && end > start)
const helpers = new Function(`${source.slice(start, end)}; return { historyFileUrl, isHistoryPreviewFor }`)()

test('history previews address one run and preserve user-provided filenames', () => {
  const entry = { id: 'legacy-1234', finishedAt: 123, final: { file: '鸭子 final model.glb' } }
  const url = new URL(helpers.historyFileUrl(entry), 'http://unit.test')
  assert.equal(url.searchParams.get('run'), entry.id)
  assert.equal(url.searchParams.get('name'), entry.final.file)
  assert.equal(url.searchParams.get('v'), '123')
  assert.equal(helpers.isHistoryPreviewFor(url.pathname + url.search, entry.id), true)
  assert.equal(helpers.isHistoryPreviewFor(url.pathname + url.search, 'legacy-123'), false)
})

function previewLoader(fetch, parseGlb) {
  const from = source.indexOf('    const previewCache = new Map()')
  const to = source.indexOf('    const LIGHT = ', from)
  assert.ok(from > 0 && to > from)
  return new Function('fetch', 'parseGlb', `${source.slice(from, to)}; return { loadModel, previewCache, previewDownloads }`)(fetch, parseGlb)
}

test('coarse and fine models share an in-flight download', async () => {
  let requests = 0
  let release
  const ready = new Promise((resolve) => { release = resolve })
  const { loadModel } = previewLoader(async () => {
    requests += 1
    await ready
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) }
  }, async (buffer, cap) => ({ cap }))
  const coarse = loadModel('/unit-model.glb?rev=1', 15000)
  const fine = loadModel('/unit-model.glb?rev=1', 40000)
  release()
  assert.equal((await coarse).cap, 15000)
  assert.equal((await fine).cap, 40000)
  assert.equal(requests, 1)
})

test('preview cache stays bounded and distinguishes rebuilt artifact revisions', async () => {
  let requests = 0
  const { loadModel, previewCache } = previewLoader(async () => {
    requests += 1
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) }
  }, async (buffer, cap) => ({ cap }))
  const first = await loadModel('/unit-model.glb?rev=1', 40000)
  assert.equal(await loadModel('/unit-model.glb?rev=1', 40000), first)
  const rebuilt = await loadModel('/unit-model.glb?rev=2', 40000)
  assert.notEqual(rebuilt, first)
  assert.equal(requests, 2)
  for (let i = 3; i <= 8; i += 1) await loadModel(`/unit-model.glb?rev=${i}`, 40000)
  assert.ok(previewCache.size <= 4)
})

test('failed preview downloads can be retried rather than caching rejection forever', async () => {
  let requests = 0
  const { loadModel, previewDownloads } = previewLoader(async () => {
    requests += 1
    if (requests === 1) return { ok: false, status: 503 }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) }
  }, async () => ({}))
  await assert.rejects(loadModel('/unit-retry.glb', 40000), /503/)
  const next = await loadModel('/unit-retry.glb', 40000)
  assert.equal(next.bytes, 16)
  assert.equal(requests, 2)
  assert.equal(previewDownloads.size, 0)
})
