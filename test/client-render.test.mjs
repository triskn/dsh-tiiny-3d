/**
 * Client smoke test. There is no browser in this environment, so the shipped
 * client.js runs in a VM with a hook-capable React stub: it must register both
 * slots and build a full element tree for the first render without throwing.
 * Text keys are checked against the dictionaries separately.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'

const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8')

function reactStub() {
  const cells = []
  let cursor = 0
  const api = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children }
    },
    useState(initial) {
      const index = cursor++
      if (!(index in cells)) cells[index] = initial
      return [cells[index], () => {}]
    },
    useRef(value) {
      cursor += 1
      return { current: value }
    },
    useEffect() {
      cursor += 1
    },
    useCallback(fn) {
      cursor += 1
      return fn
    },
    useMemo(fn) {
      cursor += 1
      return fn()
    },
    reset() {
      cursor = 0
    },
  }
  return api
}

async function boot(sourceText = source) {
  let captured = null
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(spec) {
          captured = spec
        },
      },
    },
    document: {
      head: { appendChild() {} },
      createElement: () => ({ style: {}, setAttribute() {}, remove() {}, appendChild() {} }),
    },
    navigator: { language: 'zh-CN' },
    console,
    URL,
    Blob,
    TextDecoder,
    Image: class {},
    FileReader: class {},
    fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }),
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout,
    clearTimeout,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
  }
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(sourceText, sandbox)
  assert.ok(captured, 'the module loader received a plugin definition')
  assert.equal(captured.id, 'dsh-tiiny-3d')

  const React = reactStub()
  const module = captured.factory((name) => {
    assert.equal(name, 'react')
    return React
  })
  return { module, React }
}

test('registers the main panel and a sidebar entry', async () => {
  const { module } = await boot()
  const registrations = []
  const ctx = {
    get: () => undefined,
    on: () => () => {},
    effect(callback) {
      callback()
      return () => {}
    },
    slots: {
      inject(key, callback) {
        callback()
        return () => {}
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
  module.apply(ctx)
  const main = registrations.find((entry) => entry.options.name === 'main')
  const sidebar = registrations.find((entry) => entry.options.name === 'sidebar.panellist')
  assert.ok(main, 'main panel registered')
  assert.equal(main.options.key, 'tiiny-3d')
  assert.ok(sidebar, 'sidebar entry registered')
  assert.equal(sidebar.options.id, 'tiiny-3d')
  assert.equal(sidebar.options.label(), 'Tiiny 3D')
})

test('first render builds a tree for an empty workspace', async () => {
  const { module, React } = await boot()
  const registrations = []
  const ctx = {
    get: () => undefined,
    on: () => () => {},
    effect(callback) {
      callback()
      return () => {}
    },
    slots: {
      inject(key, callback) {
        callback()
        return () => {}
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
  module.apply(ctx)
  const panel = registrations.find((entry) => entry.options.name === 'main').component
  React.reset()
  const tree = panel()
  assert.ok(tree && tree.type, 'returned an element')
  assert.equal(tree.type, 'div')
  assert.equal(tree.props.className, 't3d-page')
  assert.equal(tree.props.lang, 'en', 'the panel declares English even with a zh-CN browser')
  assert.match(JSON.stringify(tree), /Tiiny 3D Workbench/)
  assert.doesNotMatch(JSON.stringify(tree), /[\p{Script=Han}]/u, 'empty-state controls are English')

  // Flatten the tree and make sure the core controls are present.
  const classes = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (node.props?.className) classes.push(node.props.className)
    for (const child of node.children || []) walk(child)
  }
  walk(tree)
  for (const name of ['t3d-head', 't3d-body', 't3d-drop', 't3d-stage', 't3d-btn primary block']) {
    assert.ok(
      classes.some((value) => value.split(' ').includes(name) || value === name),
      `renders ${name}`,
    )
  }
  assert.ok(classes.filter((value) => value.split(' ').includes('t3d-stage')).length >= 3, 'stage rows')

  // The key gate must be an actionable control, not a static notice.
  const nodes = []
  const collect = (node) => {
    if (!node || typeof node !== 'object') return
    nodes.push(node)
    for (const child of node.children || []) collect(child)
  }
  collect(tree)
  const cta = nodes.find((node) => node.props?.className === 't3d-cta')
  assert.ok(cta, 'renders the missing-key call to action')
  assert.equal(cta.type, 'button', 'the call to action is a button')
  const chip = nodes.find((node) => typeof node.props?.className === 'string' && node.props.className.startsWith('t3d-chip'))
  assert.equal(chip?.type, 'button', 'the status chip is clickable while setup is missing')
})

test('nested components can be invoked without throwing', async () => {
  // The panel only *creates* elements for its children, so an ordering bug such
  // as a useCallback depending on a const declared below it never shows up in a
  // plain render. Call the child components the same way React would.
  const { module, React } = await boot()
  const registrations = []
  module.apply({
    get: () => undefined,
    on: () => () => {},
    effect(callback) {
      callback()
      return () => {}
    },
    slots: {
      inject(key, callback) {
        callback()
        return () => {}
      },
      register(options, component) {
        registrations.push({ options, component })
      },
    },
  })
  const panel = registrations.find((entry) => entry.options.name === 'main').component
  React.reset()
  const tree = panel()
  const children = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (typeof node.type === 'function') children.push(node)
    for (const child of node.children || []) walk(child)
  }
  walk(tree)
  assert.ok(children.length > 0, 'the panel nests at least one component')
  for (const element of children) {
    React.reset()
    assert.doesNotThrow(() => element.type(element.props), `component ${element.type.name || 'anonymous'} renders`)
  }
})

test('every used text key has a unique English translation', async () => {
  const keys = new Set()
  for (const match of source.matchAll(/\bt\('([A-Za-z]+)'/g)) keys.add(match[1])
  // stage labels and hints are built dynamically, so list them explicitly
  for (const stage of ['Shape', 'Simplify', 'Texture', 'Export']) {
    keys.add(`stage${stage}`)
    keys.add(`stage${stage}Hint`)
  }
  for (const key of ['stagePending', 'stageRunning', 'stageCompleted', 'stageFailed', 'stageCancelled', 'stageSkipped']) keys.add(key)

  for (const locale of ['zh', 'en']) {
    const dictionary = JSON.parse(await fs.readFile(new URL(`../locale/${locale}.json`, import.meta.url), 'utf8'))
    assert.ok(dictionary.meta?.title, `${locale} metadata`)
    assert.ok(dictionary.meta?.description, `${locale} description`)
  }

  const en = source.slice(source.indexOf('      en: {'), source.indexOf('    // This workbench is English-only'))
  for (const key of keys) {
    const matches = [...en.matchAll(new RegExp(`\\b${key}:`, 'g'))]
    assert.equal(matches.length, 1, `one English translation for ${key}`)
  }
  assert.doesNotMatch(en, /[\p{Script=Han}]/u, 'the dictionary is entirely English')
})

test('expanded settings, advanced, and history sections render', async () => {
  // Flip every collapsed section open, then render: this covers the branches a
  // closed-by-default panel would otherwise never execute.
  const expanded = source.replace(/useState\(false\)/g, 'useState(true)')
  const { module, React } = await boot(expanded)
  const registrations = []
  module.apply({
    get: () => undefined,
    on: () => () => {},
    effect(callback) {
      callback()
      return () => {}
    },
    slots: {
      inject(key, callback) {
        callback()
        return () => {}
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  })
  const panel = registrations.find((entry) => entry.options.name === 'main').component
  React.reset()
  const tree = panel()

  const text = []
  const collect = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') {
      text.push(String(node))
      return
    }
    if (Array.isArray(node)) {
      node.forEach(collect)
      return
    }
    collect(node.children)
  }
  collect(tree)
  const joined = text.join(' | ')
  assert.doesNotMatch(joined, /[\p{Script=Han}]/u, 'expanded sections use English')
  for (const expected of ['Connection & key', 'Seed', 'No runs yet', 'Fewer options']) {
    assert.ok(joined.includes(expected), `expanded view shows ${expected}`)
  }
})

test('pending device cancellation stays visible and does not enable another run', async () => {
  const run = {
    id: 'cancel-1234', status: 'running', cancelRequested: true,
    phase: 'shape:cancelling', createdAt: Date.now(), progress: 12,
    plan: ['shape', 'texture', 'export'],
    stages: { shape: { status: 'running', cancelPending: true, progress: 25, needsReset: true, waiting: true, cancelError: 'Cancel request failed; still checking device status.' } },
  }
  const injected = source
    .replace('const [run, setRun] = useState(null)', `const [run, setRun] = useState(${JSON.stringify(run)})`)
    .replace('const [settings, setSettings] = useState(null)', 'const [settings, setSettings] = useState({ hasApiKey: true })')
    .replace('const [image, setImage] = useState(null)', 'const [image, setImage] = useState({ dataUrl: "data:image/png;base64,eA==", name: "ready.png" })')
  assert.notEqual(injected, source, 'the test injects the pending run state')
  const { module, React } = await boot(injected)
  const registrations = []
  module.apply({
    get: () => undefined, on: () => () => {},
    effect(callback) { callback(); return () => {} },
    slots: {
      inject(key, callback) { callback(); return () => {} },
      register(options, component) { registrations.push({ options, component }); return () => {} },
    },
  })
  const panel = registrations.find((entry) => entry.options.name === 'main').component
  React.reset()
  const tree = panel()
  const nodes = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    nodes.push(node)
    for (const child of node.children || []) walk(child)
  }
  walk(tree)
  const cancel = nodes.find((node) => node.type === 'button' && node.props.className === 't3d-btn ghost' && node.children.includes('Cancelling…'))
  assert.ok(cancel, 'cancel is shown as pending rather than a finished cancellation')
  assert.equal(cancel.props.disabled, true)
  const generate = nodes.find((node) => node.props.className === 't3d-btn primary block')
  assert.equal(generate.props.disabled, true, 'new generation remains unavailable even with an image and API key')
  assert.ok(!nodes.some((node) => node.type === 'button' && node.children.includes('Resume task')), 'do not offer resume while cancellation is pending')
  assert.ok(nodes.some((node) => node.props.title === run.stages.shape.cancelError), 'full cancellation error is available on the stage message')
  assert.ok(nodes.some((node) => node.props.className === 't3d-badge cancelling'))
  assert.ok(nodes.some((node) => node.props.role === 'status' && node.children.some((value) => typeof value === 'string' && value.includes('until cancellation is confirmed'))))
})
