/**
 * Tiiny 3D workbench — Host half.
 *
 * Bridges the Harness Web UI to the Image-to-3D service on a Tiiny device
 * ($BASE_URL/3d/*): probes the loaded model, submits each pipeline stage as a
 * multipart task, polls it, downloads artifacts into a per-run workspace, and
 * serves a small control API the Client panel calls.
 *
 * Stages, from the Tiiny Image-to-3D API:
 *   shape -> simplify (optional) -> texture -> export
 */
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { polishGlb } from './glb.js'
import { spawn } from 'node:child_process'

/**
 * User data lives outside the package: pnpm may replace the package directory
 * on upgrade, so run workspaces and settings must not sit next to this file.
 */
const DATA_DIR = process.env.TIINY_3D_HOME ? path.resolve(process.env.TIINY_3D_HOME) : path.join(os.homedir(), '.tiiny-3d')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
const RUNS_DIR = path.join(DATA_DIR, 'runs')

const DEFAULTS = {
  baseUrl: process.env.TIINY_3D_BASE_URL || 'http://api.tiiny/v1',
  apiKey: process.env.TIINY_API_KEY || '',
  outputDir: path.join(os.homedir(), 'tiiny-3d'),
  settleDelay: 75,
  simplify: false,
  // Repair the device's linear-space albedo and missing normals on export.
  polish: true,
}

/** Pipeline order, device field names, and the share of overall progress. */
const STAGES = [
  { id: 'shape', input: 'image', weight: 45, optional: false },
  { id: 'simplify', input: 'mesh', weight: 10, optional: true },
  { id: 'texture', input: 'image+mesh', weight: 25, optional: false },
  { id: 'export', input: 'material', weight: 20, optional: false },
]
const STAGE_IDS = STAGES.map((stage) => stage.id)

/** Preset values documented for Hunyuan3D-2.1; used when the device stays silent. */
const PRESET_ENUMS = {
  output_precision: ['draft', 'standard', 'high'],
  inference_quality: ['fast', 'balance', 'quality'],
  asset_quality: ['fast', 'balance', 'quality'],
}

const PARAM_STAGES = {
  shape: ['output_precision', 'inference_quality', 'seed'],
  simplify: ['asset_quality', 'target_faces'],
  texture: ['inference_quality'],
  export: ['asset_quality'],
}

/**
 * The panel exposes one quality choice; it expands to these per-stage values.
 * `texture_size` and `supersample` are export-stage parameters the device reports
 * in `/3d/capabilities`; leaving them out made the device bake at 2K without
 * supersampling even at the highest preset.
 */
/**
 * `step` / `guidance_scale` follow the numbers Tencent publishes for 2.1:
 * 50 sampling steps at full quality (fewer steps lose detail) and guidance 5.0.
 * The official Gradio demo ships guidance 7.5, so anyone who prefers the
 * tighter adherence can still override it under "more options".
 */
const QUALITY_PRESETS = {
  fast: { output_precision: 'draft', inference_quality: 'fast', asset_quality: 'fast', texture_size: 1024, supersample: false, step: 25, guidance_scale: 5.0 },
  balance: { output_precision: 'standard', inference_quality: 'balance', asset_quality: 'balance', texture_size: 2048, supersample: true, step: 35, guidance_scale: 5.0 },
  quality: { output_precision: 'high', inference_quality: 'quality', asset_quality: 'quality', texture_size: 4096, supersample: true, step: 50, guidance_scale: 5.0 },
}

/** Simplify is opt-in, so when it runs it should still keep enough detail. */
const SIMPLIFY_TARGET_FACES = 120000

/** Type hints for the parameters this device reports without a schema. */
const KNOWN_PARAMS = {
  step: { type: 'number', min: 1, max: 60, default: 30, description: 'Number of diffusion steps for the shape' },
  guidance_scale: { type: 'number', min: 0, max: 20, step: 0.1, default: 5 },
  paint_step: { type: 'number', min: 1, max: 30, default: 8 },
  texture_size: { type: 'number', min: 512, max: 4096, step: 256, default: 2048 },
  supersample: { type: 'boolean', default: false },
  target_faces: { type: 'number', min: 1000, max: 300000, step: 1000, default: 30000 },
  auto_smooth_angle: { type: 'number', min: 0, max: 180, default: 60 },
  shade_type: { type: 'enum', options: ['SMOOTH', 'FLAT'], default: 'SMOOTH' },
  merge_vertices: { type: 'boolean', default: false },
  simplify: { type: 'boolean', default: true },
  mc_level: { type: 'number', default: 0 },
  depth_tolerance: { type: 'number', step: 0.001, default: 0.002 },
  return_mask: { type: 'boolean', default: false },
  output_name: { type: 'string', default: '' },
}

/** Device polling cadence; the docs use 3 s, tests shorten it. */
const POLL_MS = clampPollInterval(Number(process.env.TIINY_3D_POLL_MS) || 2000)
// A cancel ACK can be overwritten by a still-running worker. Observe repeated
// GET snapshots across a quiet window, never just the control response.
const CANCEL_CONFIRM_MS = Math.max(POLL_MS * 2, Number(process.env.TIINY_3D_CANCEL_CONFIRM_MS) || 10000)
const CANCEL_RETRY_MS = Math.max(POLL_MS, Number(process.env.TIINY_3D_CANCEL_RETRY_MS) || 10000)

function clampPollInterval(value) {
  return Number.isFinite(value) ? Math.min(10000, Math.max(5, value)) : 2000
}

const runs = new Map()
const runSaves = new Map()

/**
 * Run ids are usually a randomUUID slice, but recovered runs from older builds
 * are named like `recovered-5b84a411`. Accept letters, digits, `_` and `-`;
 * anything else could escape the runs directory.
 */
function runIdOf(value) {
  const id = String(value || '').trim()
  return /^[A-Za-z0-9_-]{4,64}$/.test(id) ? id : ''
}
let activeRunId = null

// ---------------------------------------------------------------------------
// small utilities

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

async function readJsonBody(req, limit = 256 * 1024 * 1024) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > limit) throw new Error('The request body exceeds the size limit.')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function stamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function sleep(ms, run, allowSkipSettle = false) {
  return new Promise((resolve) => {
    const step = 250
    let waited = 0
    const tick = () => {
      if (run && run.cancelRequested) return resolve('cancelled')
      if (allowSkipSettle && run?.skipSettle) return resolve('skipped')
      waited += step
      if (waited >= ms) return resolve('ok')
      setTimeout(tick, step)
    }
    setTimeout(tick, Math.min(step, ms))
  })
}

/** User-facing file name: keep unicode, drop separators and characters macOS rejects. */
function safeFileName(name, fallback = 'model') {
  const base = String(name || '').replace(/\\/g, '/').split('/').pop() || ''
  const clean = base
    .replace(/[\u0000-\u001f<>:"|?*]/g, '')
    .replace(/^\.+/, '')
    .trim()
  return clean || fallback
}

/** Validate a requested basename without changing Unicode or spaces. */
function fileNameOf(value) {
  if (typeof value !== 'string' || !value.trim() || value === '.' || value === '..') return ''
  return /[\/\\\u0000-\u001f\u007f<>:"|?*]/.test(value) ? '' : value
}

function safeName(name, fallback = 'artifact') {
  const base = String(name || '').replace(/\\/g, '/').split('/').pop() || ''
  const clean = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '')
  return clean || fallback
}

function extOf(name, mime) {
  const fromName = /\.([A-Za-z0-9]+)$/.exec(String(name || ''))
  if (fromName) return fromName[1].toLowerCase()
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  return 'png'
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(String(dataUrl || '').trim())
  if (!match) return null
  return { mime: match[1].toLowerCase(), bytes: Buffer.from(match[2], 'base64') }
}

// ---------------------------------------------------------------------------
// settings

async function readSettings() {
  let stored = {}
  try {
    stored = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'))
  } catch {
    stored = {}
  }
  return {
    baseUrl: typeof stored.baseUrl === 'string' && stored.baseUrl.trim() ? stored.baseUrl.trim().replace(/\/+$/, '') : DEFAULTS.baseUrl,
    apiKey: typeof stored.apiKey === 'string' ? stored.apiKey.trim() : DEFAULTS.apiKey,
    outputDir: typeof stored.outputDir === 'string' && stored.outputDir.trim() ? stored.outputDir.trim() : DEFAULTS.outputDir,
    settleDelay: Number.isFinite(stored.settleDelay) ? clamp(Math.round(stored.settleDelay), 0, 300) : DEFAULTS.settleDelay,
    simplify: typeof stored.simplify === 'boolean' ? stored.simplify : DEFAULTS.simplify,
    polish: typeof stored.polish === 'boolean' ? stored.polish : DEFAULTS.polish,
  }
}

async function writeSettings(patch) {
  const current = await readSettings()
  const next = { ...current, ...patch }
  await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2), { mode: 0o600 })
  return next
}

function publicSettings(settings) {
  return {
    baseUrl: settings.baseUrl,
    outputDir: settings.outputDir,
    settleDelay: settings.settleDelay,
    simplify: settings.simplify,
    polish: settings.polish,
    hasApiKey: Boolean(settings.apiKey),
    stages: STAGES,
    presets: PRESET_ENUMS,
    paramStages: PARAM_STAGES,
    platform: process.platform,
  }
}

// ---------------------------------------------------------------------------
// device API

class DeviceError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

const DEVICE_HINTS = {
  400: 'The device rejected the input or parameters. Check parameter names and values at /3d/capabilities.',
  404: 'The path or task_id was not found. Check that the Base URL ends with /v1.',
  409: 'This task belongs to a different model instance.',
  413: 'The request body exceeds 200 MB.',
  422: 'The device does not support this stage or control action.',
  429: 'Another 3D task is running on the device. Wait for it to finish, then try again.',
  502: 'The model service failed or the connection was interrupted. Check whether the task was created before submitting it again.',
  503: 'No 3D model is running on the device. Load Hunyuan3D-2.1 in TiinyOS first.',
  504: 'The model service timed out.',
}

function humanize(error) {
  if (!(error instanceof DeviceError)) return describeFetchError(error)
  const hint = DEVICE_HINTS[error.status]
  const detail = String(error.message || '').trim()
  if (!hint) return detail || `HTTP ${error.status}`
  if (!detail || detail === `HTTP ${error.status}`) return hint
  return `${hint} (${detail})`
}

/** fetch aborts arrive as TimeoutError/AbortError with no useful text; name them plainly. */
function describeFetchError(error) {
  const name = error?.name || ''
  const message = String(error?.message || error)
  if (name === 'TimeoutError' || /aborted due to timeout|timed out/i.test(message)) {
    return 'The device did not respond before the request timed out.'
  }
  if (name === 'AbortError') return 'The request was aborted.'
  const cause = error?.cause?.code || error?.cause?.message
  return cause ? `${message} (${cause})` : message
}

class Device {
  constructor(settings) {
    this.root = String(settings.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.apiKey = settings.apiKey
  }

  headers(extra = {}) {
    const out = { ...extra }
    if (this.apiKey) out.authorization = `Bearer ${this.apiKey}`
    return out
  }

  async request(pathname, init = {}) {
    const { timeoutMs = 120000, ...rest } = init
    return fetch(`${this.root}${pathname}`, {
      ...rest,
      headers: this.headers(rest.headers || {}),
      signal: AbortSignal.timeout(timeoutMs),
    })
  }

  async payload(pathname, init = {}) {
    const response = await this.request(pathname, init)
    const text = await response.text().catch(() => '')
    let body = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    if (!response.ok) {
      const message = body?.message || body?.error?.message || (typeof body?.error === 'string' ? body.error : '') || text.slice(0, 300)
      throw new DeviceError(String(message || '').trim() || `HTTP ${response.status}`, response.status, body)
    }
    // Task endpoints wrap payloads in {status, data}; unwrap when present.
    return body && typeof body === 'object' && 'data' in body ? body.data : body
  }

  health() {
    return this.payload('/3d/health', { timeoutMs: 8000 })
  }

  models() {
    return this.payload('/3d/models', { timeoutMs: 15000 })
  }

  capabilities() {
    return this.payload('/3d/capabilities', { timeoutMs: 20000 })
  }

  version() {
    return this.payload('/3d/version', { timeoutMs: 10000 })
  }

  async submit(stage, params, files) {
    const form = new FormData()
    form.set('stage', stage)
    form.set('params', JSON.stringify(params || {}))
    for (const [field, file] of Object.entries(files || {})) {
      form.set(field, new Blob([file.bytes], { type: file.mime || 'application/octet-stream' }), file.name)
    }
    const headers = this.modelInstance ? { 'x-tiiny-model-instance': this.modelInstance } : {}
    try {
      const data = await this.payload('/3d/tasks', { method: 'POST', body: form, timeoutMs: 30 * 60 * 1000, headers })
      const taskId = data?.task_id || data?.taskId || data?.id
      if (!taskId) throw new DeviceError('The device did not return a task_id.', 502, data)
      return taskId
    } catch (error) {
      // The server may have created a task before its response was lost. Never
      // turn an ambiguous POST into a retry, or imply that no device task exists.
      if (!(error instanceof DeviceError) || [500, 502, 504].includes(error.status)) {
        const unknown = new DeviceError(`Upstream unavailable or response incomplete; submission outcome unknown. No automatic retry was made. Verify device task state before submitting again. ${describeFetchError(error)}`, error instanceof DeviceError ? error.status : 0, error?.payload)
        unknown.submissionUnknown = true
        throw unknown
      }
      throw error
    }
  }

  task(taskId) {
    return this.payload(`/3d/tasks/${encodeURIComponent(taskId)}`, { timeoutMs: 180000 })
  }

  control(taskId, action) {
    return this.payload(`/3d/tasks/${encodeURIComponent(taskId)}/${action}`, { method: 'POST', timeoutMs: 30000 })
  }

  async artifact(taskId, artifactId) {
    const response = await this.request(`/3d/tasks/${encodeURIComponent(taskId)}/artifacts/${encodeURIComponent(artifactId)}`, {
      timeoutMs: 15 * 60 * 1000,
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new DeviceError(text.slice(0, 300) || `Failed to download the artifact: HTTP ${response.status}`, response.status)
    }
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      mime: response.headers.get('content-type') || 'application/octet-stream',
    }
  }
}

// ---------------------------------------------------------------------------
// capabilities

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, entry]) => (entry && typeof entry === 'object' ? { name: key, ...entry } : { name: key, value: entry }))
  }
  return []
}

/** Find a parameter descriptor anywhere in the capabilities payload. */
function findParam(node, name, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return undefined
  if (!Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (key === name && value && typeof value === 'object') return value
    }
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      const hit = findParam(value, name, depth + 1)
      if (hit) return hit
    }
  }
  return undefined
}

function optionsOf(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') return undefined
  const raw = descriptor.enum || descriptor.enums || descriptor.options || descriptor.choices || descriptor.values || descriptor.allowed || descriptor.range
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : undefined
  if (!list) return undefined
  const flat = list
    .map((item) => (item && typeof item === 'object' ? item.value ?? item.id ?? item.name : item))
    .filter((item) => item !== undefined && item !== null && item !== '')
  return flat.length ? flat.map((item) => String(item)) : undefined
}

function normalizeParam(stage, raw, fallbackName) {
  const given = raw && typeof raw === 'object' ? raw : {}
  const name = String(given.name || given.key || given.id || given.param || fallbackName || '')
  if (!name) return null
  // The device reports parameter names without a schema; fill in known types.
  const source = { ...(KNOWN_PARAMS[name] || {}), ...given }
  const options = optionsOf(source)
  const defaultValue = source.default ?? source.defaultValue ?? source.value ?? source.current
  const numericDefault = typeof defaultValue === 'number' ? defaultValue : Number(defaultValue)
  const type = options ? 'enum' : source.type === 'boolean' || typeof defaultValue === 'boolean' ? 'boolean' : Number.isFinite(numericDefault) ? 'number' : 'string'
  return {
    stage,
    name,
    type,
    default: defaultValue === undefined ? (type === 'number' ? null : type === 'boolean' ? null : '') : defaultValue,
    options,
    min: Number.isFinite(source.min ?? source.minimum) ? source.min ?? source.minimum : undefined,
    max: Number.isFinite(source.max ?? source.maximum) ? source.max ?? source.maximum : undefined,
    step: Number.isFinite(source.step) ? source.step : type === 'number' ? 1 : undefined,
    description: String(source.description || source.desc || source.hint || source.help || source.title || ''),
    documented: Boolean(PARAM_STAGES[stage]?.includes(name)),
  }
}

function normalizeCapabilities(raw) {
  const groups = []
  const seen = new Set()
  const push = (stage, params) => {
    if (!params.length) return
    let group = groups.find((item) => item.stage === stage)
    if (!group) {
      group = { stage, params: [] }
      groups.push(group)
    }
    for (const param of params) {
      if (seen.has(`${stage}:${param.name}`)) continue
      group.params.push(param)
      seen.add(`${stage}:${param.name}`)
    }
  }

  // Schema A (this device): { stages: ["shape",...], params: { shape: ["step",...] } }
  const flat = raw?.params || raw?.data?.params
  if (flat && typeof flat === 'object' && !Array.isArray(flat)) {
    for (const [stage, names] of Object.entries(flat)) {
      if (!STAGE_IDS.includes(stage)) continue
      push(stage, asArray(names).map((item) => normalizeParam(stage, typeof item === 'string' ? { name: item } : item)).filter(Boolean))
    }
  }

  // Schema B: [{ stage, parameters: { name: descriptor } }]
  const stages = raw?.stages || raw?.data?.stages || raw?.stage_list || raw?.capabilities?.stages
  for (const entry of asArray(stages)) {
    if (typeof entry !== 'object' || entry === null) continue
    const id = String(entry.stage || entry.id || entry.name || '').replace(/^.*\./, '')
    if (!STAGE_IDS.includes(id)) continue
    const list = entry.parameters || entry.params || entry.options || entry.controls || entry.fields || entry.config
    push(id, asArray(list).map((item) => normalizeParam(id, typeof item === 'string' ? { name: item } : item)).filter(Boolean))
  }
  // Fall back to known stage parameters that the device reports somewhere else.
  for (const [stage, names] of Object.entries(PARAM_STAGES)) {
    for (const name of names) {
      if (seen.has(`${stage}:${name}`)) continue
      const descriptor = findParam(raw, name)
      if (!descriptor) continue
      push(stage, [normalizeParam(stage, { ...descriptor, name }, name)].filter(Boolean))
    }
  }
  return groups
}

function deriveEnums(raw) {
  const list = (value) => {
    const names = asArray(value).map((item) => String(typeof item === 'object' && item !== null ? item.id ?? item.name ?? item.value : item))
    return names.filter(Boolean)
  }
  const precisions = list(raw?.output_precisions || raw?.data?.output_precisions)
  const inference = list(raw?.inference_qualities || raw?.data?.inference_qualities)
  const asset = list(raw?.asset_qualities || raw?.data?.asset_qualities)
  const enums = {
    output_precision: precisions.length ? precisions : PRESET_ENUMS.output_precision,
    inference_quality: inference.length ? inference : PRESET_ENUMS.inference_quality,
    asset_quality: asset.length ? asset : PRESET_ENUMS.asset_quality,
  }
  for (const name of Object.keys(PRESET_ENUMS)) {
    if (enums[name] !== PRESET_ENUMS[name]) continue
    const options = optionsOf(findParam(raw, name))
    if (options && options.length) enums[name] = options
  }
  return enums
}

function modelIdOf(models) {
  if (!models) return ''
  const candidates = [models.model_id, models.modelId, models.id, models.name, models.model, models.current, models.data?.model_id, models.data?.id]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  const list = asArray(models.models || models.data || models.items)
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) return item.trim()
    if (item && typeof item === 'object') {
      const id = item.model_id || item.id || item.name || item.model
      if (typeof id === 'string' && id.trim()) return id.trim()
    }
  }
  return ''
}

/**
 * The TiinyOS model store is not part of the documented /3d API, but it is the
 * only way to start a downloaded model without asking the user to open TiinyOS.
 * Endpoint and payload mirror what TiinyOS itself calls.
 */
function modelServiceRoot() {
  return (process.env.TIINY_MODEL_SERVICE || 'http://tiiny-model.managed.tiiny').replace(/\/+$/, '')
}

async function modelStore(settings, pathname, init = {}) {
  const response = await fetch(`${modelServiceRoot()}${pathname}`, {
    ...init,
    headers: { accept: 'application/json', authorization: `Bearer ${settings.apiKey}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  })
  const text = await response.text().catch(() => '')
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || body?.detail || text.slice(0, 200)
    throw new DeviceError(String(message || '').trim() || `HTTP ${response.status}`, response.status, body)
  }
  return body
}

/** The Image-to-3D model the device has installed, if any. */
async function installedImageTo3D(settings) {
  const body = await modelStore(settings, '/api/v1/models/')
  const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  const model = list.find((item) => String(item?.type || '').toLowerCase() === 'image-to-3d')
  if (!model) return null
  const id = model.model_id || model.id || ''
  if (!id) return null
  return { id, name: model.display_name || model.name || id, status: String(model.status || '') }
}

/** Best effort: what the panel could start with one click. Never fails the probe. */
async function launchable(settings) {
  if (!settings.apiKey) return null
  try {
    return await installedImageTo3D(settings)
  } catch {
    return null
  }
}

async function probe(settings) {
  const device = new Device(settings)
  const state = {
    ok: false,
    reachable: false,
    authorized: false,
    // Why the connection is not usable: unreachable | no-key | bad-key | base-url | no-model | error
    problem: '',
    baseUrl: device.root,
    health: null,
    model: '',
    version: null,
    capabilities: null,
    paramGroups: [],
    enums: deriveEnums(null),
    error: '',
    at: Date.now(),
  }
  try {
    state.health = await device.health()
    state.reachable = true
  } catch (error) {
    // Anything that throws before an HTTP status exists (DNS, refused, timeout)
    // is a genuine reachability failure. A DeviceError means the device answered
    // on some status, so it is up and the status says what is missing.
    if (!(error instanceof DeviceError)) {
      state.problem = 'unreachable'
      state.error = settings.apiKey ? humanize(error) : 'The device is unreachable. Check the Base URL and network connection.'
      return state
    }
    state.reachable = true
    const detail = String(error.message || '').trim()
    if (!settings.apiKey) {
      state.problem = 'no-key'
      state.error = 'The API key is missing. Copy it from Settings > API Key in TiinyOS, then paste it into the settings on this page.'
      return state
    }
    if (error.status === 401 || error.status === 403) {
      state.problem = 'bad-key'
      state.error = `The API key was rejected (${detail || `HTTP ${error.status}`}). First confirm that the device is online in TiinyOS (an offline device can cause this too), then check Settings > API Key.`
      return state
    }
    if (error.status === 503 || /no suitable model|no 3d model|no_model/i.test(detail)) {
      state.problem = 'no-model'
      // The key was accepted before routing (a bad key answers 401), so the only
      // thing missing is a loaded Hunyuan3D model.
      state.authorized = true
      state.error = 'The device is online, but no 3D model is running. Load Tencent/Hunyuan3D-2.1 in TiinyOS first.'
      state.launchable = await launchable(settings)
      return state
    }
    if (error.status === 404 || error.status === 405) {
      state.problem = 'base-url'
      state.error = `The Base URL is incorrect. Use http://api.tiiny/v1 (or http://<device-ip>/v1). The /3d/health endpoint at ${state.baseUrl} returned HTTP ${error.status}.`
      return state
    }
    state.problem = 'error'
    state.error = humanize(error)
    return state
  }
  if (!settings.apiKey) {
    state.problem = 'no-key'
    state.error = 'The API key is missing. Copy it from Settings > API Key in TiinyOS, then paste it into the settings on this page.'
    return state
  }
  try {
    const [models, capabilities, version] = await Promise.all([
      device.models().catch((error) => ({ __error: humanize(error), __status: error instanceof DeviceError ? error.status : 0 })),
      device.capabilities().catch((error) => ({ __error: humanize(error) })),
      device.version().catch(() => null),
    ])
    state.authorized = !models?.__error
    state.model = modelIdOf(models)
    state.version = version
    if (models?.__error) {
      if (models.__status === 503) {
        state.problem = 'no-model'
        state.error = 'The device is online, but no 3D model is running. Load Tencent/Hunyuan3D-2.1 in TiinyOS first.'
      } else if (models.__status === 401 || models.__status === 403) {
        state.problem = 'bad-key'
        state.error = `The API key was rejected (${models.__error}). First confirm that the device is online in TiinyOS, then check Settings > API Key.`
      } else {
        state.problem = 'error'
        state.error = models.__error
      }
    } else if (capabilities && !capabilities.__error) {
      state.capabilities = capabilities
      state.paramGroups = normalizeCapabilities(capabilities)
      state.enums = deriveEnums(capabilities)
    } else if (capabilities?.__error) {
      state.problem = 'error'
      state.error = capabilities.__error
    }
    state.ok = state.authorized && Boolean(state.model)
    if (state.authorized && !state.model) {
      state.problem = 'no-model'
      state.error = 'No 3D model is running. Load Tencent/Hunyuan3D-2.1 in TiinyOS first.'
      state.launchable = await launchable(settings)
    }
  } catch (error) {
    state.problem = state.reachable ? 'error' : 'unreachable'
    state.error = humanize(error)
  }
  return state
}

// ---------------------------------------------------------------------------
// runs

function newStageRecord() {
  return { status: 'pending', progress: 0, taskId: '', ms: 0, file: '', path: '', bytes: 0, error: '', artifacts: [], cancelPending: false, cancelError: '', submissionUnknown: false }
}

/** Documented parameters; safe to send to any version of the 3D service. */
const ALWAYS_ALLOWED = new Set(['output_precision', 'inference_quality', 'asset_quality', 'seed'])

/** Map stage → advertised parameter names, or null when capabilities are unknown. */
function advertisedParams(capabilities) {
  if (!capabilities) return null
  const advertised = {}
  for (const group of normalizeCapabilities(capabilities)) {
    advertised[group.stage] = new Set(group.params.map((param) => param.name))
  }
  return advertised
}

/**
 * The device answers 400 for a parameter it does not advertise, so the preset
 * extras (step, guidance, texture_size, supersample, target_faces) are dropped
 * whenever the live capabilities do not list them.
 */
function filterParams(params, advertised) {
  const out = {}
  for (const [stage, values] of Object.entries(params)) {
    const names = advertised?.[stage]
    out[stage] = {}
    for (const [key, value] of Object.entries(values)) {
      if (ALWAYS_ALLOWED.has(key) || (names && names.has(key))) out[stage][key] = value
    }
    if (!Object.keys(out[stage]).length) delete out[stage]
  }
  return out
}

/**
 * One user-facing quality choice, expanded into the documented parameters.
 * `extras` carries per-stage overrides from the panel's advanced section.
 */
function buildStageParams(body, advertised) {
  const presetName = QUALITY_PRESETS[body?.preset] ? body.preset : 'fast'
  const preset = QUALITY_PRESETS[presetName]
  const seed = Number.isFinite(body?.seed) ? Math.max(0, Math.round(body.seed)) : 42
  const params = {
    shape: {
      output_precision: preset.output_precision,
      inference_quality: preset.inference_quality,
      seed,
      step: preset.step,
      guidance_scale: preset.guidance_scale,
    },
    texture: { inference_quality: preset.inference_quality },
    export: { asset_quality: preset.asset_quality, texture_size: preset.texture_size, supersample: preset.supersample },
  }
  if (body?.options?.simplify === true) params.simplify = { asset_quality: preset.asset_quality, target_faces: SIMPLIFY_TARGET_FACES }
  const merge = (source) => {
    if (!source || typeof source !== 'object') return
    for (const stage of STAGE_IDS) {
      const values = source[stage]
      if (!values || typeof values !== 'object') continue
      params[stage] = { ...(params[stage] || {}), ...values }
    }
  }
  merge(body?.extras)
  merge(body?.params)
  return filterParams(params, advertised)
}

function buildPlan(options) {
  return ['shape', options.simplify ? 'simplify' : null, 'texture', 'export'].filter(Boolean)
}

function createRun({ image, options, params }) {
  const id = randomUUID().slice(0, 8)
  const run = {
    id,
    createdAt: Date.now(),
    finishedAt: 0,
    status: 'running',
    phase: 'starting',
    progress: 0,
    cancelRequested: false,
    skipSettle: false,
    paused: false,
    image: { name: image.name, bytes: image.bytes, file: '', mime: image.mime },
    options: { ...options },
    params: { ...params },
    plan: buildPlan(options),
    stages: Object.fromEntries(STAGE_IDS.map((stage) => [stage, newStageRecord()])),
    log: [],
    final: null,
    error: '',
  }
  run.workspace = path.join(RUNS_DIR, id)
  return run
}

function log(run, text, level = 'info') {
  run.log.push({ t: Date.now(), level, text })
  if (run.log.length > 400) run.log.splice(0, run.log.length - 400)
}

function computeProgress(run) {
  const total = STAGES.filter((stage) => run.plan.includes(stage.id)).reduce((sum, stage) => sum + stage.weight, 0) || 1
  let done = 0
  for (const stage of STAGES) {
    if (!run.plan.includes(stage.id)) continue
    const record = run.stages[stage.id]
    const ratio = record.status === 'completed' ? 1 : record.status === 'running' ? clamp(record.progress, 0, 99) / 100 : 0
    done += stage.weight * ratio
  }
  run.progress = Math.round((done / total) * 100)
  return run.progress
}

function unresolvedDeviceTask(run) {
  return Object.values(run.stages || {}).find((stage) => stage.cancelPending)
}

function cancellationState(run) {
  if (Object.values(run.stages || {}).some((stage) => stage.cancelPending)) return 'pending'
  if (run.cancelRequested && run.status === 'running') return 'requested'
  return run.status === 'cancelled' ? 'confirmed' : ''
}

/** Restart guard: reconcile only saved, known cancellation task ids via GET.
 * Unknown submissions are recorded and warned about, never automatically retried.
 */
async function submissionBlock(settings) {
  if (activeRunId) {
    const active = runs.get(activeRunId)
    const record = active && unresolvedDeviceTask(active)
    return record
      ? `Cancellation is still pending${record.taskId ? ` for task ${record.taskId}` : ''}. Wait for a verified terminal device status before submitting again.`
      : 'A task is already running. Wait for it to finish or cancel it first.'
  }
  let entries
  try {
    entries = await fs.readdir(RUNS_DIR, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    return 'Cannot verify saved device task state. New submissions remain blocked.'
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !runIdOf(entry.name)) continue
    const file = path.join(RUNS_DIR, entry.name, 'run.json')
    let saved
    try {
      saved = JSON.parse(await fs.readFile(file, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      return `Cannot verify saved task state for run ${entry.name}. New submissions remain blocked.`
    }
    const pending = Object.values(saved.stages || {}).filter((stage) => stage.cancelPending && stage.taskId)
    for (const record of pending) {
      const blocked = `Run ${entry.name} has an unconfirmed cancellation for task ${record.taskId}. New submissions remain blocked.`
      let terminal = null
      const device = new Device(settings)
      const deadline = Date.now() + CANCEL_CONFIRM_MS + Math.max(POLL_MS * 3, 1000)
      while (true) {
        let snapshot
        try {
          snapshot = await device.task(record.taskId)
        } catch {
          return blocked
        }
        if (!['cancelled', 'completed', 'error'].includes(snapshot?.status)) return blocked
        const key = JSON.stringify([snapshot.status, snapshot.progress, snapshot.updated_at])
        terminal = terminal?.key === key ? { ...terminal, count: terminal.count + 1 } : { key, since: Date.now(), count: 1 }
        if (terminal.count >= 3 && Date.now() - terminal.since >= CANCEL_CONFIRM_MS) {
          record.cancelPending = false
          record.cancelError = ''
          record.deviceStatus = snapshot.status
          record.status = snapshot.status === 'error' ? 'failed' : snapshot.status
          break
        }
        if (Date.now() >= deadline) return blocked
        await sleep(POLL_MS)
      }
    }
    if (pending.length) {
      // The interrupted local pipeline is not resumed, nor are new device tasks
      // created here. A subsequent explicit request may start only after this.
      saved.status = 'cancelled'
      saved.phase = 'cancelled'
      saved.cancelState = 'confirmed'
      saved.finishedAt = Date.now()
      try {
        await fs.writeFile(file, JSON.stringify(saved, null, 2))
      } catch {
        return `Cannot save verified cancellation for run ${entry.name}. New submissions remain blocked.`
      }
    }
  }
  return ''
}

async function saveRun(run) {
  const file = path.join(run.workspace, 'run.json')
  let snapshot
  try {
    // Capture at call time, then publish in call order. Otherwise an older
    // overlapping save could overwrite a newer cancellation marker.
    snapshot = JSON.stringify(serializeRun(run, true), null, 2)
  } catch {
    return
  }
  const saving = (runSaves.get(file) || Promise.resolve()).then(async () => {
    const temporary = path.join(run.workspace, `.run-${randomUUID()}.tmp`)
    try {
      // Readers always see a complete old or new snapshot, never a truncated
      // run.json. The temporary file shares its destination filesystem.
      await fs.writeFile(temporary, snapshot, { mode: 0o600 })
      await fs.rename(temporary, file)
    } catch {
      /* workspace may be gone; the panel still works from memory */
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {})
    }
  })
  runSaves.set(file, saving)
  await saving
  if (runSaves.get(file) === saving) runSaves.delete(file)
}

function serializeRun(run, withLog = true) {
  return {
    id: run.id,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
    status: run.status,
    phase: run.phase,
    progress: run.progress,
    cancelRequested: run.cancelRequested,
    cancelState: cancellationState(run),
    image: { name: run.image.name, bytes: run.image.bytes, file: run.image.file, mime: run.image.mime },
    options: run.options,
    params: run.params,
    plan: run.plan,
    stages: run.stages,
    final: run.final,
    error: run.error,
    outputDir: run.outputDir || '',
    log: withLog ? run.log : run.log.slice(-40),
  }
}

async function recordHistory(run) {
  try {
    const entry = {
      id: run.id,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt || Date.now(),
      status: run.status,
      error: run.error,
      image: run.image.name,
      final: run.final ? { file: run.final.file, path: run.final.path, bytes: run.final.bytes } : null,
      options: run.options,
      params: run.params,
      progress: run.progress,
    }
    let history = []
    try {
      history = JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'))
    } catch {
      history = []
    }
    const next = [entry, ...history.filter((item) => item && item.id !== entry.id)].slice(0, 40)
    await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
    await fs.writeFile(HISTORY_FILE, JSON.stringify(next, null, 2), { mode: 0o600 })
  } catch {
    /* history is a convenience, never a failure */
  }
}

async function stageFiles(run, stageId) {
  const ws = run.workspace
  const file = async (name, mime) => {
    const target = path.join(ws, name)
    const bytes = await fs.readFile(target)
    return { bytes, name, mime }
  }
  switch (stageId) {
    case 'shape':
      return { image: await file(run.image.file, run.image.mime) }
    case 'simplify':
      return { mesh: await file(run.stages.shape.file, 'model/gltf-binary') }
    case 'texture': {
      const mesh = run.stages.simplify.status === 'completed' ? run.stages.simplify.file : run.stages.shape.file
      return { image: await file(run.image.file, run.image.mime), mesh: await file(mesh, 'model/gltf-binary') }
    }
    case 'export':
      return { material: await file(run.stages.texture.file, 'application/zip') }
    default:
      throw new Error(`Unknown stage: ${stageId}`)
  }
}

function stageParams(run, stageId) {
  const source = run.params[stageId] || {}
  const out = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

/**
 * Poll one stage task.
 *
 * Two device behaviours make a naive loop wrong:
 *  - a status query can block behind inference for minutes, so one timeout must
 *    be retried instead of failing a 30-minute stage;
 *  - `waiting_for_device_reset` usually clears without a reboot, so resume the
 *    task a few times before handing the decision back to the user.
 */
async function pollTask(run, device, stageId, taskId) {
  const record = run.stages[stageId]
  const deadline = Date.now() + 45 * 60 * 1000
  let pollFailures = 0
  let resumeAttempts = 0
  let lastProgress = -1
  let nextCancelAt = 0
  let terminal = null
  // An unconfirmed cancellation must retain ownership even after the normal
  // inference deadline. Query/control failures are not evidence of termination.
  while (Date.now() < deadline || run.cancelRequested) {
    if (run.cancelRequested) {
      record.cancelPending = true
      record.resumeRequested = false
      record.phase = 'cancelling'
      run.phase = `${stageId}:cancelling`
      await saveRun(run)
      if (Date.now() >= nextCancelAt && !terminal) {
        nextCancelAt = Date.now() + CANCEL_RETRY_MS
        try {
          await device.control(taskId, 'cancel')
          record.cancelError = ''
          log(run, `${stageId}: Cancel request acknowledged; waiting for stable terminal task status`, 'warn')
        } catch (error) {
          record.cancelError = humanize(error)
          log(run, `${stageId}: Cancel request failed: ${record.cancelError}. Cancellation is still pending; new submissions remain blocked.`, 'warn')
        }
        await saveRun(run)
      }
    } else if (record.resumeRequested) {
      record.resumeRequested = false
      await device.control(taskId, 'resume').catch(() => {})
      log(run, `${stageId}: Resume requested`)
    }

    let snapshot = null
    try {
      snapshot = await device.task(taskId)
      pollFailures = 0
    } catch (error) {
      terminal = null
      // During cancellation even a missing task cannot prove its worker stopped.
      if (!run.cancelRequested && error instanceof DeviceError && (error.status === 404 || error.status === 410)) throw error
      pollFailures += 1
      const detail = describeFetchError(error)
      record.phase = run.cancelRequested ? 'cancelling' : 'poll-retry'
      log(run, `${stageId}: Failed to query task status (attempt ${pollFailures}): ${detail}. Retrying.`, 'warn')
      if (!run.cancelRequested && pollFailures >= 12) throw new Error(`Task status queries failed ${pollFailures} times in a row: ${detail}`)
      await sleep(Math.min(15000, POLL_MS * pollFailures), run.cancelRequested ? undefined : run)
      continue
    }

    const status = String(snapshot?.status || '')
    const progress = Number(snapshot?.progress)
    if (Number.isFinite(progress)) {
      record.progress = clamp(progress, 0, 100)
      if (progress > lastProgress) {
        lastProgress = progress
        resumeAttempts = 0
      }
    }
    record.deviceStatus = status
    record.phase = run.cancelRequested ? 'cancelling' : status
    run.phase = `${stageId}:${record.phase || 'running'}`

    if (run.cancelRequested) {
      record.cancelPending = true
      // Cancel responses and even the first GET may race with the worker. Any
      // live status, changed terminal snapshot or failed GET resets this window.
      const isTerminal = ['cancelled', 'completed', 'error'].includes(status)
      const key = JSON.stringify([status, snapshot?.progress, snapshot?.updated_at])
      if (isTerminal) {
        terminal = terminal?.key === key ? { ...terminal, count: terminal.count + 1 } : { key, since: Date.now(), count: 1 }
        if (terminal.count < 3 || Date.now() - terminal.since < CANCEL_CONFIRM_MS) {
          await saveRun(run)
          await sleep(POLL_MS)
          continue
        }
        record.cancelPending = false
        record.cancelError = ''
        log(run, `${stageId}: Device terminal status ${status} remained stable across ${terminal.count} queries`, 'info')
        await saveRun(run)
      } else {
        if (terminal) log(run, `${stageId}: Task returned to ${status || 'unknown'} after a terminal snapshot; cancellation remains pending`, 'warn')
        terminal = null
        computeProgress(run)
        await saveRun(run)
        await sleep(POLL_MS)
        continue
      }
    }

    if (status === 'completed') {
      record.waiting = false
      record.needsReset = false
      computeProgress(run)
      return snapshot
    }
    if (status === 'cancelled') throw new Error('cancelled')
    if (status === 'error') {
      const detail = snapshot?.error || snapshot?.message || 'The device reported that the task failed.'
      const code = snapshot?.error_code ? ` (${snapshot.error_code})` : ''
      throw new Error(`${detail}${code}`)
    }

    if (status === 'waiting_for_device_reset') {
      const deviceError = [snapshot?.error, snapshot?.message].filter(Boolean).join(' · ')
      record.waiting = true
      record.deviceError = deviceError
      if (resumeAttempts < 3) {
        resumeAttempts += 1
        log(run, `${stageId}: The device reported "${deviceError || 'reset required'}". Automatic resume attempt ${resumeAttempts}.`, 'warn')
        await sleep(resumeAttempts === 1 ? 1500 : 8000, run)
        if (run.cancelRequested) continue
        try {
          await device.control(taskId, 'resume')
        } catch (error) {
          log(run, `${stageId}: Resume failed: ${humanize(error)}`, 'warn')
        }
      } else {
        // Stop hammering the device: the user has to reset it, then can resume.
        if (!record.needsReset) {
          record.needsReset = true
          log(run, `${stageId}: Automatic resume did not resolve the issue. Reset the device, then click "Resume task".`, 'error')
        }
      }
      computeProgress(run)
      await sleep(POLL_MS, run)
      continue
    }

    record.waiting = false
    record.needsReset = false
    record.deviceError = ''
    computeProgress(run)
    await sleep(POLL_MS, run)
  }
  throw new Error('The task timed out after 45 minutes.')
}

async function collectArtifacts(run, device, stageId, taskId, snapshot) {
  const record = run.stages[stageId]
  const artifacts = snapshot?.result?.output?.artifacts || []
  const saved = []
  for (const artifact of artifacts) {
    const artifactId = artifact.artifact_id || artifact.id
    if (!artifactId) continue
    const name = safeName(artifact.filename || `${stageId}.bin`)
    const { bytes, mime } = await device.artifact(taskId, artifactId)
    const target = path.join(run.workspace, name)
    await fs.writeFile(target, bytes)
    saved.push({ artifactId, name, bytes: bytes.length, mime: mime || artifact.mime_type || '', type: artifact.artifact_type || stageId })
    log(run, `${stageId}: Downloaded ${name} (${(bytes.length / 1024 / 1024).toFixed(2)} MB)`)
  }
  if (!saved.length) throw new Error('The task completed but returned no artifacts.')
  record.artifacts = saved
  return saved
}

function pickArtifact(saved, stageId) {
  const byName = (pattern) => saved.find((item) => pattern.test(item.name))
  if (stageId === 'export') return byName(/painted.*\.glb$/i) || byName(/\.glb$/i) || saved[saved.length - 1]
  if (stageId === 'texture') return byName(/\.zip$/i) || saved[0]
  if (stageId === 'simplify') return byName(/simplified.*\.glb$/i) || byName(/\.glb$/i) || saved[0]
  return byName(/shape.*\.glb$/i) || byName(/\.glb$/i) || saved[0]
}

/**
 * The device bakes its albedo in linear space and ships no normals; see glb.js.
 * A failure here must never lose the run: the untouched artifact stays on disk.
 */
async function polishExport(run, saved) {
  const target = path.join(run.workspace, saved.name)
  try {
    const before = await fs.readFile(target)
    const started = Date.now()
    const result = polishGlb(before)
    const applied = result.changes.filter((line) => !line.includes('skipped'))
    if (result.bytes !== before && applied.length) {
      await fs.writeFile(target, result.bytes)
      saved.bytes = result.bytes.length
      log(run, `export: Applied repairs: ${applied.join('; ')} (${Date.now() - started} ms)`, 'success')
    }
    for (const line of result.changes.filter((item) => item.includes('skipped'))) log(run, `export: ${line}`, 'warn')
  } catch (error) {
    log(run, `export: Repairs failed; keeping the original device file. ${String(error?.message || error)}`, 'warn')
  }
}

async function executeStage(run, device, stageId) {
  const record = run.stages[stageId]
  const started = Date.now()
  record.status = 'running'
  record.progress = 0
  record.error = ''
  record.taskId = ''
  record.cancelPending = false
  record.cancelError = ''
  record.submissionUnknown = false
  record.needsReset = false
  record.waiting = false
  record.deviceError = ''
  run.phase = `${stageId}:submitting`
  computeProgress(run)
  log(run, `${stageId}: Submitting task`)
  try {
    record.phase = 'preparing'
    const files = await stageFiles(run, stageId)
    const params = stageParams(run, stageId)
    if (run.cancelRequested) throw new Error('cancelled')
    const submitStarted = Date.now()
    record.phase = 'submitting'
    const heartbeat = setInterval(() => {
      const waited = Math.round((Date.now() - submitStarted) / 1000)
      if (waited >= 45) log(run, `${stageId}: Waiting for the device to accept the task (${waited} s). Large meshes may need extra time to free memory.`)
    }, 30000)
    let taskId
    try {
      taskId = await device.submit(stageId, params, files)
    } finally {
      clearInterval(heartbeat)
    }
    const submitMs = Date.now() - submitStarted
    if (submitMs > 5000) log(run, `${stageId}: Device accepted the task after ${(submitMs / 1000).toFixed(1)} s`)
    record.taskId = taskId
    log(run, `${stageId}: task ${taskId}`)
    const snapshot = await pollTask(run, device, stageId, taskId)
    const saved = await collectArtifacts(run, device, stageId, taskId, snapshot)
    const artifact = pickArtifact(saved, stageId)
    if (stageId === 'export' && run.options.polish !== false && /\.glb$/i.test(artifact.name)) await polishExport(run, artifact)
    record.file = artifact.name
    record.path = path.join(run.workspace, artifact.name)
    record.bytes = artifact.bytes
    record.status = 'completed'
    record.progress = 100
    record.ms = Date.now() - started
    computeProgress(run)
    log(run, `${stageId}: Completed in ${(record.ms / 1000).toFixed(1)} s`, 'success')
    await saveRun(run)
    return record
  } catch (error) {
    const message = String(error?.message || error)
    if (error?.submissionUnknown) {
      record.submissionUnknown = true
      record.submissionError = { status: error.status, message, reportedTaskId: error.payload?.task_id || error.payload?.data?.task_id || '' }
      record.phase = 'submission-unknown'
    }
    // If submission was rejected or its outcome is unknown there is no known
    // task to confirm. Keep the unknown flag, not a fictitious cancel success.
    if (!record.taskId) record.cancelPending = false
    if (message === 'cancelled') {
      record.status = 'cancelled'
      record.error = 'Cancelled'
      log(run, `${stageId}: Cancelled`, 'warn')
    } else {
      record.status = 'failed'
      record.error = humanize(error)
      log(run, `${stageId}: Failed: ${record.error}`, 'error')
    }
    record.ms = Date.now() - started
    computeProgress(run)
    await saveRun(run)
    throw error
  }
}

async function finishRun(run) {
  if (unresolvedDeviceTask(run)) {
    run.status = 'running'
    run.phase = 'cancelling'
    run.finishedAt = 0
    await saveRun(run)
    return
  }
  run.finishedAt = Date.now()
  // Cancellation is an intention, not proof of a terminal device state. Preserve
  // verified completion or failure when the cancel request arrived too late.
  if (run.status === 'running') run.status = 'completed'
  if (run.status === 'completed') {
    const exportStage = run.stages.export
    if (exportStage.status === 'completed' && exportStage.path) {
      try {
        const settings = await readSettings()
        const dir = run.outputDir || settings.outputDir
        await fs.mkdir(dir, { recursive: true })
        const name = `tiiny3d-${stamp()}-${run.id}-painted.glb`
        const target = path.join(dir, name)
        await fs.copyFile(exportStage.path, target)
        const stat = await fs.stat(target)
        run.final = { file: name, path: target, bytes: stat.size }
        log(run, `Saved the final model to ${target}`, 'success')
      } catch (error) {
        log(run, `Failed to copy the final model: ${String(error?.message || error)}`, 'warn')
      }
    }
  }
  computeProgress(run)
  run.phase = run.status
  await saveRun(run)
  await recordHistory(run)
  if (activeRunId === run.id) activeRunId = null
}

async function runPipeline(run, device) {
  try {
    for (const stageId of run.plan) {
      if (run.cancelRequested) throw new Error('cancelled')
      if (stageId === 'export' && run.options.settleDelay > 0 && !run.skipSettle) {
        const waitMs = run.options.settleDelay * 1000
        log(run, `Waiting ${run.options.settleDelay} s for the device to free resources before export (you can skip this wait)`)
        run.phase = 'settle'
        const outcome = await sleep(waitMs, run, true)
        if (outcome === 'cancelled') throw new Error('cancelled')
      }
      await executeStage(run, device, stageId)
    }
    run.status = 'completed'
  } catch (error) {
    if (String(error?.message) === 'cancelled') {
      run.status = 'cancelled'
      run.error = 'Cancelled'
    } else {
      run.status = 'failed'
      run.error = humanize(error)
    }
  } finally {
    try {
      await finishRun(run)
    } catch (error) {
      run.status = 'failed'
      run.error = humanize(error)
    }
  }
}

async function prepareImage(run, image, mime) {
  await fs.mkdir(run.workspace, { recursive: true, mode: 0o700 })
  const ext = extOf(image.name, mime)
  const file = `source.${ext}`
  await fs.writeFile(path.join(run.workspace, file), image.bytes)
  run.image.file = file
  return { ext, mime }
}

// ---------------------------------------------------------------------------
// history + artifacts listing

async function readHistory() {
  try {
    const parsed = JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeHistory(entries) {
  await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
  await fs.writeFile(HISTORY_FILE, JSON.stringify((entries || []).slice(0, 60), null, 2), { mode: 0o600 })
}

function isRunRunning(id) {
  return activeRunId === id || runs.get(id)?.status === 'running'
}

/** Retain the history row when either file removal fails, so cleanup can be retried. */
async function removeRunFiles(entry) {
  const removed = { workspace: false, final: false }
  const failures = []
  const id = runIdOf(entry.id)
  const workspace = id ? path.resolve(RUNS_DIR, id) : ''
  if (!id || path.dirname(workspace) !== path.resolve(RUNS_DIR)) {
    failures.push({ target: 'workspace', error: 'Invalid run ID.' })
    return { removed, failures }
  }
  try {
    const saved = JSON.parse(await fs.readFile(path.join(workspace, 'run.json'), 'utf8'))
    if (unresolvedDeviceTask(saved)) {
      failures.push({ target: 'workspace', error: 'Cancellation is not confirmed; task evidence must be retained.' })
      return { removed, failures }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      failures.push({ target: 'workspace', error: 'Cannot verify saved device task state; task evidence was retained.' })
      return { removed, failures }
    }
  }
  const remove = async (kind, target, recursive = false) => {
    try {
      await fs.rm(target, { recursive, force: true })
      removed[kind] = true
    } catch (error) {
      failures.push({ target: kind, error: String(error?.message || error) })
    }
  }
  await remove('workspace', workspace, true)
  if (entry.final?.path) {
    const finalPath = typeof entry.final.path === 'string' ? path.resolve(entry.final.path) : ''
    const name = finalPath ? path.basename(finalPath) : ''
    if (!fileNameOf(name) || (entry.final.file && entry.final.file !== name)) {
      failures.push({ target: 'final', error: 'The final model path does not match its file name.' })
    } else {
      await remove('final', finalPath)
    }
  }
  return { removed, failures }
}

async function fileEntry(ws, name, type) {
  try {
    const target = path.join(ws, name)
    const stat = await fs.stat(target)
    return { name, type, bytes: stat.size, mtime: stat.mtimeMs }
  } catch {
    return null
  }
}

async function listRunArtifacts(run) {
  const out = []
  for (const stage of STAGES) {
    const record = run.stages[stage.id]
    for (const artifact of record.artifacts || []) {
      out.push({ stage: stage.id, name: artifact.name, bytes: artifact.bytes, mime: artifact.mime, type: artifact.type })
    }
  }
  if (run.final) out.push({ stage: 'final', name: run.final.file, bytes: run.final.bytes, mime: 'model/gltf-binary', type: 'final', path: run.final.path })
  return out
}

function runView(run) {
  return {
    ...serializeRun(run, true),
    artifacts: undefined,
    outputDir: run.outputDir || '',
    stages: Object.fromEntries(
      STAGE_IDS.map((stage) => [
        stage,
        {
          ...run.stages[stage],
          url:
            run.stages[stage].status === 'completed' && run.stages[stage].file
              ? `/tiiny-3d/file?run=${encodeURIComponent(run.id)}&name=${encodeURIComponent(run.stages[stage].file)}&rev=${encodeURIComponent(run.stages[stage].taskId || run.finishedAt || run.createdAt)}`
              : '',
        },
      ]),
    ),
    imageUrl: run.image.file ? `/tiiny-3d/file?run=${encodeURIComponent(run.id)}&name=${encodeURIComponent(run.image.file)}` : '',
    finalUrl: run.final ? `/tiiny-3d/file?run=${encodeURIComponent(run.id)}&name=${encodeURIComponent(run.final.file)}&rev=${encodeURIComponent(run.stages.export.taskId || run.finishedAt || run.createdAt)}` : '',
  }
}

// ---------------------------------------------------------------------------
// route

function serveFile(res, filePath) {
  return fs.stat(filePath).then((stat) => {
    const ext = path.extname(filePath).toLowerCase()
    const types = {
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.md': 'text/markdown; charset=utf-8',
    }
    const name = path.basename(filePath)
    const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, '_') || 'download'
    const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    res.writeHead(200, {
      'content-type': types[ext] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'private, no-store',
      'content-disposition': `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`,
    })
    createReadStream(filePath).pipe(res)
  })
}

const route = {
  kind: 'prefix',
  path: '/tiiny-3d',
  async handler(req, res) {
    const url = new URL(req.url || '/', 'http://localhost')
    const pathname = url.pathname.replace(/^\/tiiny-3d/, '') || '/'
    const method = req.method || 'GET'
    try {
      if (method === 'GET' && (pathname === '/' || pathname === '/settings')) {
        return json(res, 200, publicSettings(await readSettings()))
      }

      if (method === 'POST' && pathname === '/settings') {
        const body = await readJsonBody(req, 1024 * 1024)
        const patch = {}
        if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) patch.baseUrl = body.baseUrl.trim()
        if (typeof body.outputDir === 'string' && body.outputDir.trim()) patch.outputDir = body.outputDir.trim()
        if (typeof body.apiKey === 'string') patch.apiKey = body.apiKey.trim()
        if (Number.isFinite(body.settleDelay)) patch.settleDelay = body.settleDelay
        if (typeof body.simplify === 'boolean') patch.simplify = body.simplify
        if (typeof body.polish === 'boolean') patch.polish = body.polish
        const settings = await writeSettings(patch)
        return json(res, 200, publicSettings(settings))
      }

      if (method === 'POST' && pathname === '/launch-model') {
        const settings = await readSettings()
        if (!settings.apiKey) return json(res, 400, { error: 'No Tiiny API key is configured.' })
        try {
          const model = await installedImageTo3D(settings)
          if (!model) return json(res, 400, { error: 'No Image-to-3D model is installed on the device.' })
          if (model.status && model.status !== 'downloaded') {
            return json(res, 409, { error: `The model download status is "${model.status}". Wait for the download to finish in TiinyOS first.` })
          }
          await modelStore(settings, `/api/v1/models/${encodeURIComponent(model.id)}/launch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ model_id: model.id }),
          })
          return json(res, 200, { model: model.id, name: model.name })
        } catch (error) {
          return json(res, 502, { error: humanize(error) })
        }
      }

      if (method === 'GET' && pathname === '/status') {
        const settings = await readSettings()
        return json(res, 200, await probe(settings))
      }

      if (method === 'POST' && pathname === '/rename-run') {
        const body = await readJsonBody(req, 64 * 1024)
        const id = runIdOf(body.id)
        if (!id) return json(res, 400, { error: 'Invalid run ID.' })
        if (isRunRunning(id)) return json(res, 409, { error: 'Cannot rename a run while it is running.' })
        const history = await readHistory()
        const index = history.findIndex((item) => item.id === id)
        if (index < 0) return json(res, 404, { error: 'Run record not found.' })
        const entry = history[index]
        if (entry.status === 'running' || isRunRunning(id)) return json(res, 409, { error: 'Cannot rename a run while it is running.' })
        if (!entry.final?.path) return json(res, 400, { error: 'This run has no final model file.' })
        const raw = String(body.name || '').trim()
        if (!raw) return json(res, 400, { error: 'The name cannot be empty.' })
        const extension = path.extname(entry.final.path) || '.glb'
        const base = safeFileName(raw.toLowerCase().endsWith(extension.toLowerCase()) ? raw : raw + extension)
        const source = path.resolve(entry.final.path)
        const target = path.join(path.dirname(source), base)
        if (target !== source) {
          const taken = await fs.stat(target).then(() => true).catch(() => false)
          if (taken) return json(res, 409, { error: 'A file with that name already exists.' })
          await fs.rename(source, target)
        }
        const stat = await fs.stat(target).catch(() => null)
        entry.final = { ...entry.final, file: base, path: target, bytes: stat ? stat.size : entry.final.bytes }
        history[index] = entry
        await writeHistory(history)
        // Keep the live run and its workspace in step with the renamed history entry.
        const current = runs.get(id)
        if (current) {
          current.final = { ...entry.final }
          await saveRun(current)
        } else {
          try {
            const recordPath = path.join(RUNS_DIR, id, 'run.json')
            const record = JSON.parse(await fs.readFile(recordPath, 'utf8'))
            record.final = entry.final
            await fs.writeFile(recordPath, JSON.stringify(record, null, 2))
          } catch {
            /* workspace already cleaned */
          }
        }
        return json(res, 200, { id, final: entry.final })
      }

      if (method === 'POST' && pathname === '/delete-failed') {
        const history = await readHistory()
        const removedIds = []
        const failures = []
        for (const entry of history.filter((item) => item.status !== 'completed')) {
          if (entry.status === 'running' || isRunRunning(entry.id)) {
            failures.push({ id: entry.id, error: 'The run is still running and was not deleted.' })
            continue
          }
          const result = await removeRunFiles(entry)
          if (result.failures.length) {
            failures.push({ id: entry.id, error: 'Could not delete all files. The run record was kept.', ...result })
          } else {
            removedIds.push(entry.id)
          }
        }
        await writeHistory(history.filter((item) => !removedIds.includes(item.id)))
        for (const id of removedIds) runs.delete(id)
        return json(res, 200, { removed: removedIds.length, removedIds, failures })
      }

      if (method === 'POST' && pathname === '/reveal-run') {
        const body = await readJsonBody(req, 64 * 1024)
        const id = runIdOf(body.id)
        if (!id) return json(res, 400, { error: 'Invalid run ID.' })
        const history = await readHistory()
        const entry = history.find((item) => item.id === id)
        if (!entry?.final?.path) return json(res, 400, { error: 'This run has no final model file.' })
        const exists = await fs.stat(entry.final.path).then(() => true).catch(() => false)
        if (!exists) return json(res, 404, { error: 'The final model file no longer exists.' })
        if (process.platform !== 'darwin') return json(res, 400, { error: 'Reveal in Finder is only available on macOS.' })
        const child = spawn('open', ['-R', entry.final.path], { detached: true, stdio: 'ignore' })
        child.unref()
        return json(res, 200, { path: entry.final.path })
      }

      if (method === 'POST' && pathname === '/delete-run') {
        const body = await readJsonBody(req, 64 * 1024)
        const id = runIdOf(body.id)
        if (!id) return json(res, 400, { error: 'Invalid run ID.' })
        if (isRunRunning(id)) return json(res, 409, { error: 'Cannot delete a run while it is running.' })
        const history = await readHistory()
        const entry = history.find((item) => item.id === id)
        if (!entry) return json(res, 404, { error: 'Run record not found.' })
        if (entry.status === 'running' || isRunRunning(id)) return json(res, 409, { error: 'Cannot delete a run while it is running.' })
        const result = await removeRunFiles(entry)
        if (result.failures.length) {
          return json(res, 500, { id, error: 'Could not delete all files. The run record was kept.', ...result })
        }
        await writeHistory(history.filter((item) => item.id !== id))
        runs.delete(id)
        return json(res, 200, { id, removed: result.removed })
      }

      if (method === 'GET' && pathname === '/history') {
        const history = await readHistory()
        return json(res, 200, { runs: history })
      }

      if (method === 'GET' && pathname === '/run') {
        const id = url.searchParams.get('id') || activeRunId || [...runs.keys()].pop()
        const run = id ? runs.get(id) : undefined
        if (!run) return json(res, 200, { run: null })
        return json(res, 200, { run: runView(run) })
      }

      if (method === 'POST' && pathname === '/generate') {
        const body = await readJsonBody(req)
        if (activeRunId) return json(res, 409, { error: 'A task is already running. Wait for it to finish or cancel it first.' })
        const settings = await readSettings()
        if (!settings.apiKey) return json(res, 400, { error: 'No Tiiny API key is configured.' })
        const image = dataUrlToBuffer(body.imageDataUrl)
        if (!image) return json(res, 400, { error: 'A reference image is required.' })
        const blocked = await submissionBlock(settings)
        if (blocked) return json(res, 409, { error: blocked })

        const options = {
          simplify: body.options?.simplify === true,
          settleDelay: Number.isFinite(body.options?.settleDelay) ? clamp(Math.round(body.options.settleDelay), 0, 300) : settings.settleDelay,
          quality: QUALITY_PRESETS[body.preset] ? body.preset : 'balance',
          polish: typeof body.options?.polish === 'boolean' ? body.options.polish : settings.polish !== false,
        }
        // Ask the device what it accepts; if it cannot answer, send only the
        // documented parameters instead of risking a 400.
        const capabilities = await new Device(settings).capabilities().catch(() => null)
        const params = buildStageParams(body, advertisedParams(capabilities))
        // Recheck after asynchronous preparation: two callers may have passed
        // the first check while capabilities was still in flight.
        if (activeRunId) return json(res, 409, { error: 'A task is already running. Wait for it to finish or cancel it first.' })
        const run = createRun({ image: { name: safeName(body.imageName || 'source.png'), bytes: image.bytes.length, mime: image.mime }, options, params })
        run.outputDir = settings.outputDir
        runs.set(run.id, run)
        activeRunId = run.id
        // Keep memory bounded; workspaces and history stay on disk.
        for (const id of runs.keys()) {
          if (runs.size <= 12) break
          if (id === run.id || id === activeRunId) continue
          runs.delete(id)
        }
        log(run, `Starting: ${run.plan.join(' -> ')}`)

        const device = new Device(settings)
        device.modelInstance = typeof body.modelInstance === 'string' ? body.modelInstance : undefined
        try {
          await prepareImage(run, { name: safeName(body.imageName || 'source.png'), bytes: image.bytes }, image.mime)
        } catch (error) {
          // No device task has been submitted yet. A local write failure must
          // not leave the generation lock held until the Host is reloaded.
          run.status = 'failed'
          run.error = humanize(error)
          log(run, `Input preparation failed: ${run.error}`, 'error')
          await finishRun(run).catch(() => {})
          if (activeRunId === run.id) activeRunId = null
          throw error
        }
        await saveRun(run)
        void runPipeline(run, device)
        return json(res, 200, { run: runView(run) })
      }

      if (method === 'POST' && pathname === '/stage') {
        const body = await readJsonBody(req, 1024 * 1024)
        const stageId = String(body.stage || '')
        if (!STAGE_IDS.includes(stageId)) return json(res, 400, { error: 'Unknown stage.' })
        const run = runs.get(body.runId) || (activeRunId ? runs.get(activeRunId) : undefined)
        if (!run) return json(res, 404, { error: 'No run is available to reuse.' })
        if (activeRunId || run.status === 'running') return json(res, 409, { error: 'A task is already running. Wait for it to finish or cancel it first.' })
        const settings = await readSettings()
        if (!settings.apiKey) return json(res, 400, { error: 'No Tiiny API key is configured.' })
        const blocked = await submissionBlock(settings)
        if (blocked) return json(res, 409, { error: blocked })
        if (activeRunId || run.status === 'running') return json(res, 409, { error: 'A task is already running. Wait for it to finish or cancel it first.' })
        const device = new Device(settings)
        // Reuse upstream inputs, but never present stale downstream artifacts as new output.
        for (const stage of STAGE_IDS.slice(STAGE_IDS.indexOf(stageId))) run.stages[stage] = newStageRecord()
        run.final = null
        run.status = 'running'
        run.phase = `${stageId}:submitting`
        run.error = ''
        run.cancelRequested = false
        run.skipSettle = true
        run.finishedAt = 0
        if (!run.plan.includes(stageId)) run.plan = [...new Set([...run.plan, stageId])]
        activeRunId = run.id
        computeProgress(run)
        log(run, `Rerunning stage: ${stageId}`)
        await saveRun(run)
        void (async () => {
          try {
            await executeStage(run, device, stageId)
            run.status = 'completed'
          } catch (error) {
            run.status = String(error?.message) === 'cancelled' ? 'cancelled' : 'failed'
            run.error = run.status === 'cancelled' ? 'Cancelled' : humanize(error)
          } finally {
            await finishRun(run)
          }
        })()
        return json(res, 200, { run: runView(run) })
      }

      if (method === 'POST' && pathname === '/cancel') {
        const run = activeRunId ? runs.get(activeRunId) : undefined
        if (!run) return json(res, 404, { error: 'No task is running.' })
        if (run.status !== 'running') return json(res, 409, { error: 'The submission outcome is unknown; no known running task is available to cancel. Verify device task state first.' })
        run.cancelRequested = true
        for (const [stageId, record] of Object.entries(run.stages)) {
          record.resumeRequested = false
          if (record.status === 'running' && record.taskId && !['completed', 'cancelled', 'error'].includes(record.deviceStatus)) {
            record.cancelPending = true
            record.phase = 'cancelling'
            run.phase = `${stageId}:cancelling`
          }
        }
        log(run, 'Cancellation requested; waiting for verified device termination', 'warn')
        await saveRun(run)
        return json(res, 200, { run: runView(run) })
      }

      if (method === 'POST' && pathname === '/skip-settle') {
        const run = activeRunId ? runs.get(activeRunId) : undefined
        if (!run) return json(res, 404, { error: 'No task is running.' })
        run.skipSettle = true
        return json(res, 200, { run: runView(run) })
      }

      if (method === 'POST' && pathname === '/resume') {
        const run = activeRunId ? runs.get(activeRunId) : undefined
        if (!run) return json(res, 404, { error: 'No task is running.' })
        if (run.cancelRequested) return json(res, 409, { error: 'Cancellation is pending; the task cannot be resumed.' })
        for (const stage of STAGE_IDS) {
          const record = run.stages[stage]
          if (record.status === 'running' && record.taskId) {
            try {
              const settings = await readSettings()
              if (run.cancelRequested) return json(res, 409, { error: 'Cancellation is pending; the task cannot be resumed.' })
              await new Device(settings).control(record.taskId, 'resume')
              log(run, `${stage}: Resume request sent`)
            } catch (error) {
              return json(res, 502, { error: humanize(error) })
            }
          }
        }
        return json(res, 200, { run: runView(run) })
      }

      if (method === 'GET' && pathname === '/file') {
        const rawName = url.searchParams.get('name') || ''
        if (!rawName) return json(res, 400, { error: 'A file name is required.' })
        const name = fileNameOf(rawName)
        if (!name) return json(res, 400, { error: 'Invalid file name.' })
        const requestedId = url.searchParams.get('id') || url.searchParams.get('run') || ''
        const id = requestedId ? runIdOf(requestedId) : activeRunId || ''
        if (requestedId && !id) return json(res, 400, { error: 'Invalid run ID.' })
        const run = id ? runs.get(id) : undefined
        const candidates = []
        if (run) {
          if (run.final?.path && name === path.basename(run.final.path)) candidates.push(run.final.path)
          const workspaceFile = name === run.image.file || Object.values(run.stages).some((stage) => stage.file === name || (stage.artifacts || []).some((artifact) => artifact.name === name))
          if (workspaceFile) candidates.push(path.join(run.workspace, name))
        } else if (id) {
          // A historical final may live in an output directory that settings no longer use.
          const entry = (await readHistory()).find((item) => item.id === id)
          if (entry) {
            if (entry.final?.path && name === path.basename(entry.final.path)) candidates.push(entry.final.path)
            candidates.push(path.join(RUNS_DIR, id, name))
          }
        }
        for (const candidate of candidates) {
          try {
            const stat = await fs.stat(candidate)
            if (stat.isFile()) return await serveFile(res, candidate)
          } catch {
            /* try the next file belonging to this run */
          }
        }
        return json(res, 404, { error: 'File not found.' })
      }

      if (method === 'GET' && pathname === '/artifacts') {
        const id = url.searchParams.get('run') || activeRunId || ''
        const run = runs.get(id)
        if (!run) return json(res, 404, { error: 'Run record not found.' })
        return json(res, 200, { artifacts: await listRunArtifacts(run) })
      }

      return json(res, 404, { error: 'Not found.' })
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
  },
}

export const inject = ['webServer']

export function apply(ctx) {
  void fs.mkdir(RUNS_DIR, { recursive: true, mode: 0o700 }).catch(() => {})
  ctx.effect(() => ctx.webServer.register(route))
}
