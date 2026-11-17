window.__ModuleLoader__.load({
  id: 'dsh-tiiny-3d',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    // -----------------------------------------------------------------------
    // text

    const TEXT = {
      en: {
        title: 'Tiiny 3D Workbench',
        subtitle: 'One image to a textured GLB · Tencent/Hunyuan3D-2.1',
        refresh: 'Refresh',
        settings: 'Settings',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved',
        cancel: 'Cancel',
        close: 'Close',
        connected: 'Connected',
        connecting: 'Checking…',
        disconnected: 'Disconnected',
        noKey: 'API key missing',
        noModel: 'No 3D model running',
        unreachable: 'Device unreachable',
        badBaseUrl: 'Base URL wrong',
        checking: 'Checking the device…',
        model: 'Model',
        version: 'Service version',
        baseUrl: 'Base URL',
        apiKey: 'API key',
        apiKeySet: 'A key is stored — leave blank to keep it',
        outputDir: 'Output folder',
        settleDelay: 'Settle delay (s)',
        settleHint: 'Let the device release resources after texturing; 75 s by default, skippable',
        outputDirHint: 'The final painted.glb is copied here',
        image: 'Reference image',
        dropImage: 'Drop an image or click to choose',
        replaceImage: 'Replace',
        clearImage: 'Remove',
        imageHint: 'Use one clearly visible subject, a front or three-quarter view, soft lighting and a sharp image of 1024px or more. Use a plain or transparent background: this device has no background removal.',
        qualityLabel: 'Quality',
        qualityHint: 'Higher quality means a finer mesh and a longer run',
        presetFast: 'Fast',
        presetBalance: 'Balanced',
        presetQuality: 'High',
        presetFastHint: 'Mesh 192 — fastest, good for a first look',
        presetBalanceHint: 'Mesh 288 — more detail, slower generation. Enable Simplify if needed.',
        presetQualityHint: 'Mesh 384 — finest detail, longest generation. Enable Simplify if needed.',
        advancedShow: 'More options',
        advancedHide: 'Fewer options',
        simplifyHint: 'Turn on only when the mesh has too many faces; adds one stage',
        runPolish: 'Polish exported GLB',
        rename: 'Rename',
        renameHint: 'Rename the exported GLB on disk',
        remove: 'Delete',
        removeConfirm: 'Confirm delete',
        removeHint: 'Remove this run\'s workspace, exported GLB and history row',
        clearFailed: 'Clear failed',
        reveal: 'Show in Finder',
        revealHint: 'Show the exported GLB in Finder',
        launchModel: 'Start on device',
        launching: 'Loading model…',
        polishHint: 'Re-encode supported textures to sRGB and add missing vertex normals before export.',
        extraOptions: 'Model parameters',
        generation: 'Generation',
        precision: 'Output precision',
        inference: 'Inference quality',
        asset: 'Asset quality',
        seed: 'Seed',
        randomSeed: 'Randomize',
        runSimplify: 'Simplify mesh',
        extraParams: 'Model-reported parameters',
        extraHint: 'Only checked parameters are sent; unchecked ones use the device default',
        advanced: 'Advanced',
        generate: 'Generate complete model',
        generating: 'Generating…',
        cancelRun: 'Cancel',
        cancelling: 'Cancelling…',
        cancelPendingHint: 'Waiting for the device to stop. New runs stay disabled until cancellation is confirmed.',
        skipSettle: 'Skip wait',
        pipeline: 'Pipeline',
        stageShape: 'Shape',
        stageSimplify: 'Simplify',
        stageTexture: 'Texture',
        stageExport: 'Export',
        stageShapeHint: 'Untextured base mesh → shape.glb',
        stageSimplifyHint: 'Reduce faces → simplified.glb',
        stageTextureHint: 'Bake the material pack → hunyuan3d_material.zip',
        stageExportHint: 'Bake geometry and materials → painted.glb',
        stagePending: 'Pending',
        stageRunning: 'Running',
        stageCancelling: 'Cancelling',
        stageCompleted: 'Done',
        stageFailed: 'Failed',
        stageCancelled: 'Cancelled',
        stageSkipped: 'Skipped',
        stageWaiting: 'Needs reset',
        waitingAuto: 'Device reported "{detail}" — resuming automatically…',
        waitingManual: 'The device needs a reset ({detail}). Reset it, then press Resume; the task continues from its checkpoint.',
        runStage: 'Run this stage',
        rerunStage: 'Run again',
        needsInput: 'Missing input',
        settleWait: 'Waiting for the device',
        preview: 'Preview',
        noPreview: 'No model to preview yet',
        previewShape: 'Shape',
        previewSimplify: 'Simplified',
        previewExport: 'Final',
        autoRotate: 'Auto-rotate',
        wireframe: 'Points',
        triangles: 'triangles',
        result: 'Artifacts',
        noArtifacts: 'No artifacts yet',
        download: 'Download',
        copyPath: 'Copy path',
        copied: 'Path copied',
        copyFailed: 'Could not copy the path. Select the path and copy it manually.',
        deleteFailed: 'Some files could not be deleted. The affected runs remain in history.',
        previewHint: 'Drag to rotate · Scroll to zoom · Double-click to reset',
        validImages: 'Choose a PNG, JPEG or WebP image.',
        log: 'Log',
        history: 'Recent runs',
        noHistory: 'No runs yet',
        totalTime: 'Total',
        error: 'Something went wrong',
        needImage: 'Choose a reference image first',
        needKeyFirst: 'Add your Tiiny API key in Settings first',
        keyNeeded: 'No Tiiny API key yet',
        addKey: 'Add key',
        badKey: 'Key rejected',
        connection: 'Connection & key',
        busyConflict: 'A run is already in progress',
        loadFailed: 'Could not read',
        openSettings: 'Connection',
        manualParams: 'Manual parameters',
        optional: 'optional',
        resume: 'Resume task',
      },
    }

    // This workbench is English-only, independently of the Harness/browser locale.
    function makeT() {
      const dict = TEXT.en
      return (key, vars) => {
        let value = dict[key] ?? key
        if (vars) {
          for (const [name, replacement] of Object.entries(vars)) value = value.replace(`{${name}}`, String(replacement))
        }
        return value
      }
    }

    // -----------------------------------------------------------------------
    // styles

    const CSS = `
.t3d-page{container:tiiny3d / inline-size;max-width:100%;min-width:0;height:100%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;min-height:0}
.t3d-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.t3d-head-mark{width:30px;height:30px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-brand-primary);flex:0 0 auto}
.t3d-head-text{display:flex;flex:1 1 220px;flex-direction:column;gap:1px;min-width:0}
.t3d-head-title{font-weight:600;font-size:14px;overflow-wrap:anywhere}
.t3d-head-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t3d-head-spacer{display:none}
.t3d-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11.5px;font-family:inherit;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.t3d-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:0 0 auto}
.t3d-dot.ok{background:var(--dsw-alias-state-success-primary)}
.t3d-dot.warn{background:var(--dsw-alias-state-warn-primary)}
.t3d-dot.err{background:var(--dsw-alias-state-error-primary)}
.t3d-body{flex:1;min-height:0;display:flex;gap:14px;padding:14px 18px 18px;overflow:hidden}
.t3d-col{display:flex;flex-direction:column;gap:12px;min-height:0}
.t3d-col.left{width:356px;flex:0 0 356px;overflow-y:auto;padding-right:2px}
.t3d-col.right{flex:1;min-width:0;overflow-y:auto}
.t3d-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;flex:0 0 auto}
.t3d-card-head{display:flex;flex-wrap:wrap;min-width:0;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.02em}
.t3d-card-body{padding:12px;display:flex;flex-direction:column;gap:10px}
.t3d-row{display:flex;align-items:center;gap:8px}
.t3d-row.wrap{flex-wrap:wrap}
.t3d-field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.t3d-label{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.t3d-input,.t3d-select,.t3d-number{height:30px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12.5px;padding:0 9px;outline:none;font-family:inherit;min-width:0}
.t3d-input:focus,.t3d-select:focus,.t3d-number:focus{border-color:var(--dsw-alias-brand-primary)}
.t3d-input::placeholder{color:var(--dsw-alias-label-secondary)}
.t3d-btn{height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12.5px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.t3d-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2)}
.t3d-btn:disabled{opacity:.5;cursor:default}
.t3d-btn.primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;font-weight:600}
.t3d-btn.primary:hover:not(:disabled){filter:brightness(1.05)}
.t3d-btn.ghost{background:transparent}
.t3d-btn.sm{height:24px;padding:0 8px;font-size:11.5px;border-radius:6px}
.t3d-btn.block{width:100%;justify-content:center;height:34px;font-size:13px}
.t3d-drop{border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);min-height:150px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;cursor:pointer;position:relative;overflow:hidden;padding:10px;text-align:center}
.t3d-drop:hover{border-color:var(--dsw-alias-brand-primary)}
.t3d-drop.over{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.t3d-drop img{max-width:100%;max-height:210px;border-radius:8px;display:block}
.t3d-drop-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.t3d-stage{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:7px;background:var(--dsw-alias-bg-layer-1)}
.t3d-stage.active{border-color:var(--dsw-alias-brand-primary)}
.t3d-stage-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}
.t3d-idx{width:20px;height:20px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.t3d-stage-name{font-weight:600;font-size:12.5px;flex:1}
.t3d-stage-hint{font-size:11px;color:var(--dsw-alias-label-secondary);flex:1 0 100%;order:1;min-width:0;overflow-wrap:anywhere}
.t3d-badge{font-size:10.5px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.t3d-badge.running{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.t3d-badge.completed{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.t3d-badge.failed{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.t3d-badge.cancelled,.t3d-badge.cancelling,.t3d-badge.skipped,.t3d-badge.waiting{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.t3d-bar{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.t3d-bar > i{display:block;height:100%;background:var(--dsw-alias-brand-primary);transition:width .3s ease}
.t3d-stage-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary);min-width:0}
.t3d-stage-foot .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t3d-preview-wrap{position:relative;border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);height:320px}
.t3d-canvas{width:100%;height:100%;display:block;cursor:grab;touch-action:none}
.t3d-canvas:active{cursor:grabbing}
.t3d-preview-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);font-size:12px;text-align:center;padding:16px}
.t3d-preview-tools{position:absolute;left:8px;bottom:8px;display:flex;gap:6px;align-items:center}
.t3d-preview-meta{position:absolute;right:10px;top:8px;font-size:10.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:2px 6px}
.t3d-tabs{display:flex;gap:4px;flex-wrap:wrap}
.t3d-tab{height:24px;padding:0 9px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:11.5px;cursor:pointer;font-family:inherit}
.t3d-tab.on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.t3d-files{display:flex;flex-direction:column;gap:6px}
.t3d-file{display:flex;align-items:center;gap:8px;font-size:11.5px;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.t3d-file .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.t3d-file .size{color:var(--dsw-alias-label-secondary);flex:0 0 auto}
.t3d-link{color:var(--dsw-alias-brand-primary);text-decoration:none;font-size:11.5px}
.t3d-error{border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);border-radius:8px;padding:7px 9px;font-size:11.5px;word-break:break-word}
.t3d-warn{border:1px solid var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary);border-radius:8px;padding:7px 9px;font-size:11.5px}
.t3d-cta{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border-radius:9px;border:1px dashed var(--dsw-alias-state-warn-primary);background:transparent;color:var(--dsw-alias-state-warn-primary);font-size:11.5px;font-family:inherit;cursor:pointer;text-align:left}
.t3d-cta:hover{background:var(--dsw-alias-bg-layer-2);border-style:solid}
.t3d-cta-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t3d-cta-action{font-weight:600;white-space:nowrap}
.t3d-chip.action{cursor:pointer;color:var(--dsw-alias-label-primary)}
.t3d-chip.action:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.t3d-chip.action .t3d-arrow{color:var(--dsw-alias-label-secondary);font-size:10px}
.t3d-log{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.55;max-height:150px;overflow:auto;background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:8px 9px;display:flex;flex-direction:column;gap:1px}
.t3d-log .t{color:var(--dsw-alias-label-secondary);margin-right:6px}
.t3d-log .error{color:var(--dsw-alias-state-error-primary)}
.t3d-log .success{color:var(--dsw-alias-state-success-primary)}
.t3d-log .warn{color:var(--dsw-alias-state-warn-primary)}
.t3d-seg{display:flex;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden}
.t3d-seg > button{flex:1;height:30px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;cursor:pointer}
.t3d-seg > button + button{border-left:1px solid var(--dsw-alias-border-l1)}
.t3d-seg > button.on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.t3d-seg > button:hover:not(.on){color:var(--dsw-alias-label-primary)}
.t3d-switch{display:inline-flex;min-width:0;overflow-wrap:anywhere;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;user-select:none}
.t3d-switch input{flex:0 0 auto;accent-color:var(--dsw-alias-brand-primary);width:14px;height:14px;cursor:pointer}
.t3d-meta{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.5}
.t3d-kv{display:grid;grid-template-columns:82px 1fr;gap:4px 8px;font-size:11.5px}
.t3d-kv .k{color:var(--dsw-alias-label-secondary)}
.t3d-kv .v{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t3d-history{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto}
.t3d-history-item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px 8px;font-size:11px;padding:8px;border:1px solid transparent;border-radius:7px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.t3d-history-item:hover{border-color:var(--dsw-alias-border-l2)}
.t3d-history-item .when{grid-column:1;grid-row:2;color:var(--dsw-alias-label-secondary)}
.t3d-history-item .size{grid-column:2;grid-row:2;color:var(--dsw-alias-label-secondary)}
.t3d-history-item .what{grid-column:1 / -1;grid-row:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t3d-history-item button.what{font:inherit;font-weight:600;color:var(--dsw-alias-label-primary);text-align:left;border:0;padding:0;background:transparent;cursor:pointer}
.t3d-history-item button.what:disabled{cursor:default}
.t3d-history-actions{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:4px}
.t3d-artifact-path{flex:1 1 140px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t3d-preview-help{padding-top:6px;overflow-wrap:anywhere}
.t3d-btn:focus-visible,.t3d-tab:focus-visible,.t3d-history-item .what:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.t3d-warn,.t3d-meta{overflow-wrap:anywhere}
.t3d-empty{padding:14px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:11.5px}
@media (max-width: 1080px){
  .t3d-body{flex-direction:column;overflow:auto}
  .t3d-col.left{width:auto;flex:0 0 auto;overflow:visible}
  .t3d-col.right{flex:0 0 auto;overflow:visible}
}
@container tiiny3d (max-width: 860px){
  .t3d-body{flex-direction:column;overflow:auto;padding:12px}
  .t3d-col.left,.t3d-col.right{width:auto;flex:0 0 auto;overflow:visible;padding-right:0}
  .t3d-head{padding:12px}
}
@container tiiny3d (max-width: 480px){
  .t3d-head-text{flex-basis:calc(100% - 50px)}
  .t3d-head .t3d-chip{height:auto;min-height:24px;white-space:normal;overflow-wrap:anywhere}
  .t3d-row{flex-wrap:wrap}
  .t3d-preview-wrap{height:280px}
  .t3d-preview-meta{max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
}
`

    // -----------------------------------------------------------------------
    // utils

    const fmtBytes = (n) => {
      const value = Number(n) || 0
      if (!value) return '—'
      if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
      if (value >= 1024) return `${Math.round(value / 1024)} KB`
      return `${value} B`
    }

    const fmtMs = (ms) => {
      const value = Number(ms) || 0
      if (value <= 0) return '—'
      if (value < 1000) return `${value} ms`
      if (value < 60000) return `${(value / 1000).toFixed(1)} s`
      return `${Math.floor(value / 60000)}m ${Math.round((value % 60000) / 1000)}s`
    }

    const fmtClock = (ms) => {
      const d = new Date(Number(ms) || Date.now())
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    async function jsonFetch(url, init) {
      const response = await fetch(url, init)
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`)
      return body
    }

    function historyFileUrl(entry) {
      return `/tiiny-3d/file?run=${encodeURIComponent(entry.id)}&name=${encodeURIComponent(entry.final.file)}&v=${encodeURIComponent(entry.finishedAt || entry.createdAt || '')}`
    }

    function isHistoryPreviewFor(url, id) {
      return url.startsWith(`/tiiny-3d/file?run=${encodeURIComponent(id)}&`)
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error || new Error('read failed'))
        reader.readAsDataURL(file)
      })
    }

    // -----------------------------------------------------------------------
    // GLB preview: parse the binary, then paint sorted flat-shaded triangles on
    // a 2D canvas. No external 3D library, so it works offline inside the shell.

    const COMPONENTS = {
      5120: [Int8Array, 1],
      5121: [Uint8Array, 1],
      5122: [Int16Array, 2],
      5123: [Uint16Array, 2],
      5125: [Uint32Array, 4],
      5126: [Float32Array, 4],
    }
    const TYPE_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

    function readAccessor(gltf, bin, index) {
      const accessor = gltf.accessors?.[index]
      if (!accessor || accessor.bufferView === undefined) return null
      const view = gltf.bufferViews?.[accessor.bufferView]
      if (!view) return null
      const component = COMPONENTS[accessor.componentType]
      if (!component) return null
      const [Ctor, compSize] = component
      const size = TYPE_SIZES[accessor.type] || 1
      const count = accessor.count || 0
      const base = (view.byteOffset || 0) + (accessor.byteOffset || 0)
      const stride = view.byteStride || size * compSize
      const total = count * size
      if (base >= bin.byteLength) return null
      if (stride === size * compSize) {
        try {
          const available = Math.floor((bin.byteLength - base) / compSize)
          const take = Math.min(total, available)
          const typed = new Ctor(bin.buffer, bin.byteOffset + base, take)
          return typed instanceof Float32Array ? typed : Float32Array.from(typed)
        } catch {
          /* misaligned buffer view: fall through to the DataView reader */
        }
      }
      const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
      const out = new Float32Array(total)
      const read = (offset) => {
        switch (accessor.componentType) {
          case 5121:
            return dv.getUint8(offset)
          case 5123:
            return dv.getUint16(offset, true)
          case 5125:
            return dv.getUint32(offset, true)
          case 5120:
            return dv.getInt8(offset)
          case 5122:
            return dv.getInt16(offset, true)
          default:
            return dv.getFloat32(offset, true)
        }
      }
      for (let i = 0; i < count; i += 1) {
        for (let c = 0; c < size; c += 1) {
          out[i * size + c] = read(base + i * stride + c * compSize)
        }
      }
      return out
    }

    function textureImageSource(gltf, bin, material) {
      const index = material?.pbrMetallicRoughness?.baseColorTexture?.index
      if (index === undefined) return null
      const texture = gltf.textures?.[index]
      const image = texture ? gltf.images?.[texture.source] : null
      if (!image) return null
      if (image.uri && !String(image.uri).startsWith('data:')) return null
      if (image.bufferView === undefined) {
        if (typeof image.uri === 'string' && image.uri.startsWith('data:')) return image.uri
        return null
      }
      const view = gltf.bufferViews?.[image.bufferView]
      if (!view) return null
      const start = view.byteOffset || 0
      const bytes = new Uint8Array(bin.buffer, bin.byteOffset + start, Math.min(view.byteLength || 0, bin.byteLength - start))
      const blob = new Blob([bytes], { type: image.mimeType || 'image/png' })
      return typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : null
    }

    async function parseGlb(buffer, cap) {
      const dv = new DataView(buffer)
      if (dv.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67) throw new Error('Not a valid GLB file')
      let offset = 12
      let gltf = null
      let bin = null
      while (offset + 8 <= dv.byteLength) {
        const length = dv.getUint32(offset, true)
        const type = dv.getUint32(offset + 4, true)
        const start = offset + 8
        if (start + length > dv.byteLength) break
        if (type === 0x4e4f534a) gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length)))
        else if (type === 0x004e4942) bin = new Uint8Array(buffer, start, length)
        offset = start + length
      }
      if (!gltf || !bin) throw new Error('The GLB is missing required data chunks')

      // A flat-colour approximation of the albedo texture keeps the preview
      // readable without sampling every texel.
      let palette = null
      try {
        const firstMaterial = (gltf.materials || []).find((material) => material?.pbrMetallicRoughness?.baseColorTexture)
        const source = firstMaterial ? textureImageSource(gltf, bin, firstMaterial) : null
        if (source) {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          await new Promise((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('texture decode failed'))
            image.src = source
          })
          const size = 1024
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context.drawImage(image, 0, 0, size, size)
          palette = { data: context.getImageData(0, 0, size, size).data, size }
          if (typeof source === 'string' && source.startsWith('blob:')) URL.revokeObjectURL(source)
        }
      } catch {
        palette = null
      }

      const triangles = []
      const colors = []
      const uvsSoup = []
      let minX = Infinity
      let minY = Infinity
      let minZ = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      let maxZ = -Infinity
      const push = (ax, ay, az, bx, by, bz, cx, cy, cz, color, uvs) => {
        triangles.push(ax, ay, az, bx, by, bz, cx, cy, cz)
        colors.push(color[0], color[1], color[2])
        if (ax < minX) minX = ax
        if (bx < minX) minX = bx
        if (cx < minX) minX = cx
        if (ay < minY) minY = ay
        if (by < minY) minY = by
        if (cy < minY) minY = cy
        if (az < minZ) minZ = az
        if (bz < minZ) minZ = bz
        if (cz < minZ) minZ = cz
        if (ax > maxX) maxX = ax
        if (bx > maxX) maxX = bx
        if (cx > maxX) maxX = cx
        if (ay > maxY) maxY = ay
        if (by > maxY) maxY = by
        if (cy > maxY) maxY = cy
        if (az > maxZ) maxZ = az
        if (bz > maxZ) maxZ = bz
        if (cz > maxZ) maxZ = cz
        void uvs
      }

      const colorFromPalette = (uvs) => {
        if (!palette || !uvs) return null
        const u = ((uvs[0] + uvs[2] + uvs[4]) / 3) % 1
        const v = ((uvs[1] + uvs[3] + uvs[5]) / 3) % 1
        const x = Math.min(palette.size - 1, Math.max(0, Math.round(Math.abs(u) * (palette.size - 1))))
        const y = Math.min(palette.size - 1, Math.max(0, Math.round(Math.abs(v) * (palette.size - 1))))
        const at = (y * palette.size + x) * 4
        const data = palette.data
        if (data[at + 3] < 12) return null
        return [data[at] / 255, data[at + 1] / 255, data[at + 2] / 255]
      }

      for (const mesh of gltf.meshes || []) {
        for (const primitive of mesh.primitives || []) {
          const mode = primitive.mode === undefined ? 4 : primitive.mode
          if (mode !== 4) continue
          const position = readAccessor(gltf, bin, primitive.attributes?.POSITION)
          if (!position) continue
          const indices = primitive.indices !== undefined ? readAccessor(gltf, bin, primitive.indices) : null
          const uvs = primitive.attributes?.TEXCOORD_0 !== undefined ? readAccessor(gltf, bin, primitive.attributes.TEXCOORD_0) : null
          const material = (gltf.materials || [])[primitive.material] || null
          const factor = material?.pbrMetallicRoughness?.baseColorFactor
          const base = factor ? [factor[0] ?? 0.7, factor[1] ?? 0.7, factor[2] ?? 0.75] : [0.62, 0.69, 0.78]
          const count = indices ? indices.length : position.length / 3
          for (let i = 0; i + 2 < count; i += 3) {
            const ia = indices ? indices[i] : i
            const ib = indices ? indices[i + 1] : i + 1
            const ic = indices ? indices[i + 2] : i + 2
            const ax = position[ia * 3]
            const ay = position[ia * 3 + 1]
            const az = position[ia * 3 + 2]
            const bx = position[ib * 3]
            const by = position[ib * 3 + 1]
            const bz = position[ib * 3 + 2]
            const cx = position[ic * 3]
            const cy = position[ic * 3 + 1]
            const cz = position[ic * 3 + 2]
            if (![ax, ay, az, bx, by, bz, cx, cy, cz].every((value) => Number.isFinite(value))) continue
            let color = base
            if (uvs) {
              const sampled = colorFromPalette([uvs[ia * 2], uvs[ia * 2 + 1], uvs[ib * 2], uvs[ib * 2 + 1], uvs[ic * 2], uvs[ic * 2 + 1]])
              if (sampled) color = sampled
            }
            push(ax, ay, az, bx, by, bz, cx, cy, cz, color)
            if (uvs) uvsSoup.push(uvs[ia * 2], uvs[ia * 2 + 1], uvs[ib * 2], uvs[ib * 2 + 1], uvs[ic * 2], uvs[ic * 2 + 1])
            else uvsSoup.push(0, 0, 0, 0, 0, 0)
          }
        }
      }
      if (!colors.length) throw new Error('The model contains no renderable triangles')
      const texture = palette ? { data: palette.data, size: palette.size } : null

      const totalTriangles = Math.floor(triangles.length / 9)
      const limit = Math.max(2000, cap || 40000)
      const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
      let radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2
      if (!Number.isFinite(radius) || radius <= 0) radius = 1

      if (totalTriangles <= limit) {
        const positions = Float32Array.from(triangles)
        const triColors = Float32Array.from(colors)
        return { positions, colors: triColors, uvs: Float32Array.from(uvsSoup), texture, count: totalTriangles, total: totalTriangles, center, radius }
      }

      // A dense mesh must be *reduced*, not sampled: skipping triangles leaves
      // gaps between the survivors and the preview turns into confetti. Snap
      // vertices to a grid, keep one face per unique cell triple, and rebuild
      // from the snapped points — closed surface, just coarser. The grid is
      // retried until the face count lands near the budget.
      const build = (grid) => {
        const spanX = (maxX - minX) || 1e-6
        const spanY = (maxY - minY) || 1e-6
        const spanZ = (maxZ - minZ) || 1e-6
        const key = (x, y, z) => {
          const ix = Math.min(grid - 1, Math.max(0, Math.floor(((x - minX) / spanX) * grid)))
          const iy = Math.min(grid - 1, Math.max(0, Math.floor(((y - minY) / spanY) * grid)))
          const iz = Math.min(grid - 1, Math.max(0, Math.floor(((z - minZ) / spanZ) * grid)))
          return ix + iy * grid + iz * grid * grid
        }
        const cells = new Map()
        for (let i = 0; i < triangles.length; i += 3) {
          const k = key(triangles[i], triangles[i + 1], triangles[i + 2])
          const cell = cells.get(k)
          if (cell) {
            cell[0] += triangles[i]
            cell[1] += triangles[i + 1]
            cell[2] += triangles[i + 2]
            cell[3] += 1
          } else {
            cells.set(k, [triangles[i], triangles[i + 1], triangles[i + 2], 1])
          }
        }
        for (const [k, cell] of cells) cells.set(k, [cell[0] / cell[3], cell[1] / cell[3], cell[2] / cell[3]])
        const seen = new Set()
        const kept = []
        const keptColors = []
        const keptUvs = []
        for (let t = 0; t < totalTriangles; t += 1) {
          const b = t * 9
          const ka = key(triangles[b], triangles[b + 1], triangles[b + 2])
          const kb = key(triangles[b + 3], triangles[b + 4], triangles[b + 5])
          const kc = key(triangles[b + 6], triangles[b + 7], triangles[b + 8])
          if (ka === kb && kb === kc) continue
          // 32-bit order-independent hash: a rare collision only drops a preview
          // triangle whose snapped corners already coincide with another one.
          const id = (Math.imul(ka, 73856093) ^ Math.imul(kb, 19349663) ^ Math.imul(kc, 83492791)) >>> 0
          if (seen.has(id)) continue
          seen.add(id)
          const a = cells.get(ka)
          const bb = cells.get(kb)
          const c = cells.get(kc)
          kept.push(a[0], a[1], a[2], bb[0], bb[1], bb[2], c[0], c[1], c[2])
          keptColors.push(colors[t * 3], colors[t * 3 + 1], colors[t * 3 + 2])
          // positions are nine floats per face, UVs only six
          const ub = t * 6
          keptUvs.push(uvsSoup[ub], uvsSoup[ub + 1], uvsSoup[ub + 2], uvsSoup[ub + 3], uvsSoup[ub + 4], uvsSoup[ub + 5])
        }
        return { kept, keptColors, keptUvs }
      }

      // Face count grows with grid² on a surface; ~50 faces per cell² is a good
      // first guess for these meshes, and the retries correct for denser or
      // emptier ones.
      let grid = Math.max(8, Math.min(220, Math.round(Math.sqrt(limit / 50))))
      let result = build(grid)
      for (let pass = 0; pass < 3; pass += 1) {
        const count = result.kept.length / 9
        const ratio = count / limit
        if (ratio > 1.35 || ratio < 0.75) {
          grid = Math.max(8, Math.min(220, Math.round(grid * Math.sqrt(limit / count))))
          result = build(grid)
        } else {
          break
        }
      }
      const kept = result.kept
      const keptColors = result.keptColors
      const keptUvs = result.keptUvs
      const positions = Float32Array.from(kept)
      const triColors = Float32Array.from(keptColors)
      return {
        positions,
        colors: triColors,
        uvs: Float32Array.from(keptUvs),
        texture,
        count: positions.length / 9,
        total: totalTriangles,
        center,
        radius,
      }
    }

    // Keep at most two coarse/fine pairs; browsing history must not retain every
    // decoded model forever. Share the download while both detail levels load.
    const previewCache = new Map()
    const previewDownloads = new Map()

    async function loadModel(url, cap) {
      const key = `${url}#${cap}`
      if (previewCache.has(key)) {
        const cached = previewCache.get(key)
        previewCache.delete(key)
        previewCache.set(key, cached)
        return cached
      }
      let download = previewDownloads.get(url)
      if (!download) {
        download = fetch(url).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.arrayBuffer()
        })
        previewDownloads.set(url, download)
        const release = () => {
          if (previewDownloads.get(url) === download) previewDownloads.delete(url)
        }
        download.then(release, release)
      }
      const pending = download.then(async (buffer) => {
        const model = await parseGlb(buffer, cap)
        model.bytes = buffer.byteLength
        return model
      })
      previewCache.set(key, pending)
      while (previewCache.size > 4) previewCache.delete(previewCache.keys().next().value)
      pending.catch(() => {
        if (previewCache.get(key) === pending) previewCache.delete(key)
      })
      return pending
    }

    const LIGHT = (() => {
      const v = [0.42, -0.55, 0.72]
      const len = Math.hypot(v[0], v[1], v[2])
      return [v[0] / len, v[1] / len, v[2] / len]
    })()

    /**
     * Still-frame renderer: a z-buffered, textured rasteriser. The flat painter
     * below only shades one colour per triangle, which at 90k sub-pixel faces
     * looks like confetti; sampling the real texture per pixel is what makes the
     * panel show the exported model rather than an impression of it.
     */
    function rasterize(model, view, width, height) {
      const out = new Uint8ClampedArray(width * height * 4)
      const depth = new Float32Array(width * height)
      depth.fill(1e30)
      for (let i = 0; i < out.length; i += 4) {
        out[i] = 250
        out[i + 1] = 250
        out[i + 2] = 250
        out[i + 3] = 255
      }
      const positions = model.positions
      const uvs = model.uvs
      const data = model.texture.data
      const size = model.texture.size
      const cyw = Math.cos(view.yaw)
      const syw = Math.sin(view.yaw)
      const cpt = Math.cos(view.pitch)
      const spt = Math.sin(view.pitch)
      const scale = (Math.min(width, height) / 2 / model.radius) * 0.86 * view.zoom
      const ox = width / 2
      const oy = height / 2
      const cx = model.center[0]
      const cy = model.center[1]
      const cz = model.center[2]
      const light = [0.36, 0.48, 0.8]
      const px = new Float32Array(3)
      const py = new Float32Array(3)
      const pz = new Float32Array(3)
      const vx = new Float32Array(3)
      const vy = new Float32Array(3)
      const vz = new Float32Array(3)
      const count = model.count
      for (let t = 0; t < count; t += 1) {
        const base = t * 9
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (let v = 0; v < 3; v += 1) {
          const x = positions[base + v * 3] - cx
          const y = positions[base + v * 3 + 1] - cy
          const z = positions[base + v * 3 + 2] - cz
          const rx = x * cyw + z * syw
          const rz = -x * syw + z * cyw
          const ry = y * cpt - rz * spt
          const rz2 = y * spt + rz * cpt
          vx[v] = rx
          vy[v] = ry
          vz[v] = rz2
          px[v] = ox + rx * scale
          py[v] = oy - ry * scale
          pz[v] = rz2
          if (px[v] < minX) minX = px[v]
          if (px[v] > maxX) maxX = px[v]
          if (py[v] < minY) minY = py[v]
          if (py[v] > maxY) maxY = py[v]
        }
        const x0 = Math.max(0, Math.floor(minX))
        const x1 = Math.min(width - 1, Math.ceil(maxX))
        const y0 = Math.max(0, Math.floor(minY))
        const y1 = Math.min(height - 1, Math.ceil(maxY))
        if (x1 < x0 || y1 < y0) continue
        const det = (py[1] - py[2]) * (px[0] - px[2]) + (px[2] - px[1]) * (py[0] - py[2])
        // det is twice the projected area in pixels; below a fraction of a pixel
        // the barycentrics are pure noise and would smear the atlas everywhere.
        if (Math.abs(det) < 0.4) continue
        const e1x = vx[1] - vx[0]
        const e1y = vy[1] - vy[0]
        const e1z = vz[1] - vz[0]
        const e2x = vx[2] - vx[0]
        const e2y = vy[2] - vy[0]
        const e2z = vz[2] - vz[0]
        let nx = e1y * e2z - e1z * e2y
        let ny = e1z * e2x - e1x * e2z
        let nz = e1x * e2y - e1y * e2x
        const nl = Math.hypot(nx, ny, nz) || 1
        const shade = 0.74 + 0.26 * Math.abs((nx / nl) * light[0] + (ny / nl) * light[1] + (nz / nl) * light[2])
        // positions carry nine floats per face, UVs only six
        const ub = t * 6
        const u0 = uvs[ub]
        const v0 = uvs[ub + 1]
        const u1 = uvs[ub + 2]
        const v1 = uvs[ub + 3]
        const u2 = uvs[ub + 4]
        const v2 = uvs[ub + 5]
        for (let pyi = y0; pyi <= y1; pyi += 1) {
          const row = pyi * width
          for (let pxi = x0; pxi <= x1; pxi += 1) {
            const w0 = ((py[1] - py[2]) * (pxi - px[2]) + (px[2] - px[1]) * (pyi - py[2])) / det
            if (w0 < 0) continue
            const w1 = ((py[2] - py[0]) * (pxi - px[2]) + (px[0] - px[2]) * (pyi - py[2])) / det
            if (w1 < 0) continue
            const w2 = 1 - w0 - w1
            if (w2 < 0) continue
            const z = w0 * pz[0] + w1 * pz[1] + w2 * pz[2]
            const index = row + pxi
            if (z >= depth[index]) continue
            depth[index] = z
            const u = w0 * u0 + w1 * u1 + w2 * u2
            const v = w0 * v0 + w1 * v1 + w2 * v2
            let tu = Math.floor((u - Math.floor(u)) * size)
            let tv = Math.floor((v - Math.floor(v)) * size)
            if (tu < 0) tu = 0
            else if (tu >= size) tu = size - 1
            if (tv < 0) tv = 0
            else if (tv >= size) tv = size - 1
            const ti = (tv * size + tu) * 4
            const o = index * 4
            out[o] = data[ti] * shade
            out[o + 1] = data[ti + 1] * shade
            out[o + 2] = data[ti + 2] * shade
            out[o + 3] = 255
          }
        }
      }
      return out
    }

    function paintTextured(context, canvas, model, view, width, height) {
      // Render above canvas resolution: at ~1 px per face the UV interpolation
      // turns into noise, at ~4 px it looks like the real material. While the
      // camera moves the cheaper 1× pass keeps dragging at full frame rate.
      const factor = view.fast ? 0.62 : Math.max(1, Math.min(2, 1200 / Math.max(width, height)))
      const rw = Math.max(64, Math.round(width * factor))
      const rh = Math.max(64, Math.round(height * factor))
      if (!model.buffer || model.buffer.width !== rw || model.buffer.height !== rh) {
        const buffer = document.createElement('canvas')
        buffer.width = rw
        buffer.height = rh
        const bufferContext = buffer.getContext('2d')
        if (!bufferContext) return false
        model.buffer = { width: rw, height: rh, canvas: buffer, context: bufferContext, image: bufferContext.createImageData(rw, rh) }
      }
      model.buffer.image.data.set(rasterize(model, view, rw, rh))
      model.buffer.context.putImageData(model.buffer.image, 0, 0)
      context.clearRect(0, 0, width, height)
      context.imageSmoothingEnabled = true
      context.drawImage(model.buffer.canvas, 0, 0, width, height)
      return true
    }

    function paint(canvas, model, view) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(80, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(80, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, width, height)
      if (!model) return
      // Both still and moving frames use the texture; only point clouds and
      // untextured meshes fall back to the painter below.
      if (model.texture && model.uvs && !view.points) {
        try {
          if (paintTextured(context, canvas, model, view, width, height)) return
        } catch (failure) {
          // Never leave a blank canvas because of the pretty path: drop back to
          // the flat painter for this model and say why once.
          model.texture = null
          if (typeof console !== 'undefined') console.warn('textured preview failed, using flat shading:', failure)
        }
      }

      const cy = Math.cos(view.yaw)
      const sy = Math.sin(view.yaw)
      const cp = Math.cos(view.pitch)
      const sp = Math.sin(view.pitch)
      const scale = (Math.min(width, height) / 2 / model.radius) * 0.78 * view.zoom
      const ox = width / 2
      const oy = height / 2
      const positions = model.positions
      const colors = model.colors
      const count = model.count
      const cx = model.center[0]
      const cyy = model.center[1]
      const cz = model.center[2]

      // Scratch buffers live on the cached model so a frame allocates nothing.
      if (!model.scratch || model.scratch.count !== count) {
        model.scratch = {
          count,
          projected: new Float32Array(count * 9),
          camera: new Float32Array(count * 9),
          depth: new Float32Array(count),
          shade: new Float32Array(count),
          order: Array.from({ length: count }, (_, index) => index),
        }
      }
      const { projected, camera, depth, shade, order } = model.scratch
      for (let t = 0; t < count; t += 1) {
        const base = t * 9
        let sumZ = 0
        for (let v = 0; v < 3; v += 1) {
          const x = positions[base + v * 3] - cx
          const y = positions[base + v * 3 + 1] - cyy
          const z = positions[base + v * 3 + 2] - cz
          const rx = x * cy + z * sy
          const rz = -x * sy + z * cy
          const ry = y * cp - rz * sp
          const rz2 = y * sp + rz * cp
          camera[base + v * 3] = rx
          camera[base + v * 3 + 1] = ry
          camera[base + v * 3 + 2] = rz2
          projected[base + v * 3] = ox + rx * scale
          projected[base + v * 3 + 1] = oy - ry * scale
          projected[base + v * 3 + 2] = rz2
          sumZ += rz2
        }
        depth[t] = sumZ / 3
        // Camera-space face normal, double sided shading.
        const ux = camera[base + 3] - camera[base]
        const uy = camera[base + 4] - camera[base + 1]
        const uz = camera[base + 5] - camera[base + 2]
        const vx = camera[base + 6] - camera[base]
        const vy = camera[base + 7] - camera[base + 1]
        const vz = camera[base + 8] - camera[base + 2]
        const nxv = uy * vz - uz * vy
        const nyv = uz * vx - ux * vz
        const nzv = ux * vy - uy * vx
        const nlen = Math.hypot(nxv, nyv, nzv) || 1
        const dot = Math.abs((nxv / nlen) * LIGHT[0] + (nyv / nlen) * LIGHT[1] + (nzv / nlen) * LIGHT[2])
        shade[t] = 0.34 + 0.66 * dot
      }

      // Far (+Z) first, near (-Z) last, matching the textured z-buffer.
      // Otherwise grey meshes and points appear to turn inside-out on drag.
      order.sort((a, b) => depth[b] - depth[a])

      const points = view.points
      if (points) {
        for (const t of order) {
          const base = t * 9
          const r = Math.round(colors[t * 3] * 255 * shade[t])
          const g = Math.round(colors[t * 3 + 1] * 255 * shade[t])
          const b = Math.round(colors[t * 3 + 2] * 255 * shade[t])
          context.fillStyle = `rgb(${r},${g},${b})`
          context.fillRect(projected[base] - 0.7, projected[base + 1] - 0.7, 1.6, 1.6)
        }
        return
      }

      for (const t of order) {
        const base = t * 9
        const r = Math.round(colors[t * 3] * 255 * shade[t])
        const g = Math.round(colors[t * 3 + 1] * 255 * shade[t])
        const b = Math.round(colors[t * 3 + 2] * 255 * shade[t])
        const style = `rgb(${r},${g},${b})`
        context.fillStyle = style
        context.strokeStyle = style
        context.lineWidth = 0.7
        context.beginPath()
        context.moveTo(projected[base], projected[base + 1])
        context.lineTo(projected[base + 3], projected[base + 4])
        context.lineTo(projected[base + 6], projected[base + 7])
        context.closePath()
        context.fill()
        context.stroke()
      }
    }

    function GlbPreview({ url, t }) {
      const canvasRef = useRef(null)
      const wrapRef = useRef(null)
      const view = useRef({ yaw: Math.PI - 0.45, pitch: 0.24, zoom: 1, dragging: false, lastX: 0, lastY: 0, points: false })
      const modelRef = useRef(null)
      const coarseRef = useRef(null)
      const rafRef = useRef(0)
      const tRef = useRef(t)
      tRef.current = t
      const fineTimer = useRef(0)
      const pending = useRef({ fine: true, frame: 0 })
      const [auto, setAuto] = useState(false)
      const [points, setPoints] = useState(false)
      const [state, setState] = useState({ loading: false, error: '', info: '' })

      // Two levels of detail: the full mesh while the view is still, a lighter
      // one while it moves. Subsampling is what left the old preview full of
      // holes, so the still frame always paints every triangle.
      const render = useCallback((useFine = true) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const model = (useFine ? modelRef.current : coarseRef.current) || modelRef.current
        view.current.fast = !useFine
        try {
          paint(canvas, model, view.current)
        } catch (failure) {
          setState((current) => ({ ...current, error: String(failure?.message || failure) }))
        }
      }, [])

      /**
       * One paint per animation frame. A trackpad fires pointermove far faster
       * than a 40k-face raster can keep up, and painting per event is what made
       * dragging feel heavy: every move queued a full render.
       */
      const requestPaint = useCallback(
        (fine) => {
          pending.current.fine = fine
          if (pending.current.frame) return
          pending.current.frame = window.requestAnimationFrame(() => {
            pending.current.frame = 0
            render(pending.current.fine)
          })
        },
        [render],
      )

      useEffect(() => {
        let alive = true
        const dispose = () => {
          alive = false
          view.current.dragging = false
          window.clearTimeout(fineTimer.current)
          if (pending.current.frame) window.cancelAnimationFrame(pending.current.frame)
          pending.current.frame = 0
        }
        // Never draw the previous asset's coarse mesh while a new URL loads.
        modelRef.current = null
        coarseRef.current = null
        view.current.dragging = false
        render()
        if (!url) {
          setState({ loading: false, error: '', info: '' })
          return dispose
        }
        setState({ loading: true, error: '', info: '' })
        loadModel(url, 15000)
          .then((model) => {
            if (alive) coarseRef.current = model
          })
          .catch(() => {})
        loadModel(url, 40000)
          .then((model) => {
            if (!alive) return
            modelRef.current = model
            coarseRef.current = coarseRef.current || model
            view.current.yaw = Math.PI - 0.45
            view.current.pitch = 0.24
            view.current.zoom = 1
            setState({ loading: false, error: '', info: `${model.count === model.total ? model.total : `${model.count}/${model.total}`} ${tRef.current('triangles')} · ${fmtBytes(model.bytes)}` })
            render()
          })
          .catch((failure) => {
            if (!alive) return
            modelRef.current = null
            setState({ loading: false, error: String(failure?.message || failure), info: '' })
            render()
          })
        return dispose
      }, [url, render])

      useEffect(() => {
        view.current.points = points
        render()
      }, [points, render])

      // Only spin the RAF loop while auto-rotation runs; dragging paints directly.
      useEffect(() => {
        if (!auto) {
          cancelAnimationFrame(rafRef.current)
          return undefined
        }
        const step = () => {
          // auto-rotation must not fight the pointer
          if (!view.current.dragging) {
            view.current.yaw += 0.007
            render(false)
          }
          rafRef.current = requestAnimationFrame(step)
        }
        rafRef.current = requestAnimationFrame(step)
        return () => cancelAnimationFrame(rafRef.current)
      }, [auto, render])

      useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap || typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(() => render())
        observer.observe(wrap)
        return () => observer.disconnect()
      }, [render])

      const onPointerDown = (event) => {
        view.current.dragging = true
        view.current.lastX = event.clientX
        view.current.lastY = event.clientY
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      const onPointerMove = (event) => {
        if (!view.current.dragging) return
        const dx = event.clientX - view.current.lastX
        const dy = event.clientY - view.current.lastY
        view.current.lastX = event.clientX
        view.current.lastY = event.clientY
        // The textured z-buffer treats negative camera Z as the visible side.
        // Rotate that surface WITH the pointer: both angles need the opposite
        // sign to the old painter, which used to treat positive Z as near.
        view.current.yaw -= dx * 0.008
        view.current.pitch = Math.max(-1.45, Math.min(1.45, view.current.pitch - dy * 0.006))
        requestPaint(false)
      }
      const onPointerUp = () => {
        if (!view.current.dragging) return
        view.current.dragging = false
        if (pending.current.frame) {
          window.cancelAnimationFrame(pending.current.frame)
          pending.current.frame = 0
        }
        render(true)
      }
      // A wheel burst must not queue one full-quality raster per notch: paint the
      // cheap pass immediately and the fine one once the wheel settles.
      const renderFineSoon = useCallback(() => {
        window.clearTimeout(fineTimer.current)
        requestPaint(false)
        fineTimer.current = window.setTimeout(() => render(true), 180)
      }, [render, requestPaint])

      /** Double-click restores the front three-quarter view after free orbiting. */
      const onDoubleClick = () => {
        view.current.yaw = Math.PI - 0.45
        view.current.pitch = 0.24
        view.current.zoom = 1
        render(true)
      }

      const onWheel = (event) => {
        event.preventDefault()
        view.current.zoom = Math.max(0.35, Math.min(3, view.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08)))
        renderFineSoon()
      }

      return h(
        'div',
        { className: 't3d-preview-wrap', ref: wrapRef },
        h('canvas', {
          ref: canvasRef,
          className: 't3d-canvas',
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: onPointerUp,
          onDoubleClick,
          onWheel,
        }),
        state.error || state.loading || !url
          ? h(
              'div',
              { className: 't3d-preview-empty' },
              state.loading ? t('checking') : state.error ? `${t('loadFailed')}: ${state.error}` : t('noPreview'),
            )
          : null,
        state.info ? h('div', { className: 't3d-preview-meta' }, state.info) : null,
        h(
          'div',
          { className: 't3d-preview-tools' },
          h(
            'button',
            { type: 'button', className: `t3d-btn sm ${auto ? '' : 'ghost'}`, onClick: () => setAuto((value) => !value) },
            t('autoRotate'),
          ),
          h(
            'button',
            { type: 'button', className: `t3d-btn sm ${points ? '' : 'ghost'}`, onClick: () => setPoints((value) => !value) },
            t('wireframe'),
          ),
        ),
      )
    }

    // -----------------------------------------------------------------------
    // panel

    function Panel(ctx) {
      const t = makeT()

      return function Tiiny3dPanel() {
        const [settings, setSettings] = useState(null)
        const [status, setStatus] = useState(null)
        const [statusBusy, setStatusBusy] = useState(false)
        const [run, setRun] = useState(null)
        const [image, setImage] = useState(null)
        const [busy, setBusy] = useState(false)
        const [cancelBusy, setCancelBusy] = useState(false)
        const [error, setError] = useState('')
        const [showSettings, setShowSettings] = useState(false)
        const [settingsNonce, setSettingsNonce] = useState(0)
        const keyInputRef = useRef(null)
        const [launching, setLaunching] = useState(false)
        const [showAdvanced, setShowAdvanced] = useState(false)
        const [showLog, setShowLog] = useState(false)
        const [showHistory, setShowHistory] = useState(false)
        const [draft, setDraft] = useState({ baseUrl: '', apiKey: '', outputDir: '', settleDelay: 75 })
        const [options, setOptions] = useState({ simplify: false, settleDelay: 75, polish: true })
        const [preset, setPreset] = useState('quality')
        const [seed, setSeed] = useState(42)
        const [extras, setExtras] = useState({})
        const [extrasEnabled, setExtrasEnabled] = useState({})
        const [previewStage, setPreviewStage] = useState('shape')
        const [history, setHistory] = useState([])
        const [historyPreview, setHistoryPreview] = useState('')
        const [historyBusy, setHistoryBusy] = useState('')
        const [historyError, setHistoryError] = useState('')
        const [copiedPath, setCopiedPath] = useState('')
        const [copyError, setCopyError] = useState('')
        const [historyEditing, setHistoryEditing] = useState('')
        const [historyDraft, setHistoryDraft] = useState('')
        const [historyConfirm, setHistoryConfirm] = useState('')
        const [over, setOver] = useState(false)
        const leftColRef = useRef(null)
        const fileInput = useRef(null)
        const pollRef = useRef(0)
        const logRef = useRef(null)

        const loadStatus = useCallback(async () => {
          setStatusBusy(true)
          let result = null
          try {
            const next = await jsonFetch('/tiiny-3d/status')
            result = next
            setStatus(next)
            if (next?.paramGroups?.length) {
              const init = {}
              const on = {}
              for (const group of next.paramGroups) {
                for (const param of group.params) {
                  const key = `${group.stage}:${param.name}`
                  if (param.default !== null && param.default !== undefined && param.default !== '') init[key] = param.default
                  on[key] = false
                }
              }
              setExtras((current) => ({ ...init, ...current }))
              setExtrasEnabled((current) => ({ ...on, ...current }))
            }
          } catch (failure) {
            result = { ok: false, reachable: false, error: String(failure?.message || failure) }
            setStatus(result)
          } finally {
            setStatusBusy(false)
          }
          return result
        }, [])

        /**
         * Start the downloaded Image-to-3D model through the device's model store,
         * then keep probing until /3d/health comes up (a launch takes ~45 s).
         */
        const launchDeviceModel = useCallback(async () => {
          setLaunching(true)
          setError('')
          try {
            await jsonFetch('/tiiny-3d/launch-model', { method: 'POST' })
            for (let attempt = 0; attempt < 40; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 3000))
              const next = await loadStatus()
              if (next?.ok) break
            }
          } catch (failure) {
            setError(String(failure?.message || failure))
          } finally {
            setLaunching(false)
          }
        }, [loadStatus])

        /** The only way into the key/base-url form: open it, and optionally focus the key field. */
        const openSettings = useCallback((focusKey = false) => {
          setShowSettings(true)
          if (focusKey) setSettingsNonce((value) => value + 1)
        }, [])

        useEffect(() => {
          if (!settingsNonce || !showSettings) return
          const column = leftColRef.current
          if (column) column.scrollTop = 0
          const node = keyInputRef.current
          if (!node) return
          node.focus()
          if (typeof node.select === 'function') node.select()
        }, [settingsNonce, showSettings])

        useEffect(() => {
          let alive = true
          jsonFetch('/tiiny-3d/settings')
            .then((value) => {
              if (!alive || !value) return
              setSettings(value)
              setDraft({ baseUrl: value.baseUrl, apiKey: '', outputDir: value.outputDir, settleDelay: value.settleDelay })
              setOptions({ simplify: value.simplify === true, settleDelay: value.settleDelay ?? 75, polish: value.polish !== false })
              // Nothing works before a key exists, so start where the key is.
              if (!value.hasApiKey) {
                setShowSettings(true)
                setSettingsNonce(1)
              }
            })
            .catch(() => {})
          jsonFetch('/tiiny-3d/run')
            .then((value) => {
              if (!alive || !value?.run) return
              setRun(value.run)
              if (value.run.image?.name) setPreviewStage(value.run.stages?.export?.status === 'completed' ? 'export' : 'shape')
            })
            .catch(() => {})
          jsonFetch('/tiiny-3d/history')
            .then((value) => {
              if (alive) setHistory(Array.isArray(value?.runs) ? value.runs : [])
            })
            .catch(() => {})
          loadStatus()
          return () => {
            alive = false
            window.clearInterval(pollRef.current)
          }
        }, [loadStatus])

        // Poll only while something is running; the Host does the device polling.
        useEffect(() => {
          window.clearInterval(pollRef.current)
          if (run?.status !== 'running') return undefined
          pollRef.current = window.setInterval(() => {
            jsonFetch('/tiiny-3d/run')
              .then((value) => {
                if (!value?.run) return
                setRun(value.run)
                if (value.run.status !== 'running') {
                  window.clearInterval(pollRef.current)
                  setBusy(false)
                  jsonFetch('/tiiny-3d/history')
                    .then((body) => setHistory(Array.isArray(body?.runs) ? body.runs : []))
                    .catch(() => {})
                }
              })
              .catch(() => {})
          }, 1200)
          return () => window.clearInterval(pollRef.current)
        }, [run?.status, run?.id])

        useEffect(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
        }, [run?.log?.length])

        const apiKeyReady = Boolean(settings?.hasApiKey)
        const running = run?.status === 'running'
        const cancelling = running && Boolean(run?.cancelRequested)
        const stageRecords = run?.stages || {}

        const pickFile = useCallback(
          async (file) => {
            if (!file) return
            if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
              setError(t('validImages'))
              return
            }
            try {
              const dataUrl = await readFileAsDataUrl(file)
              setImage({ dataUrl, name: file.name, bytes: file.size })
              setError('')
            } catch (failure) {
              setError(String(failure?.message || failure))
            }
          },
          [],
        )

        const saveSettings = useCallback(async () => {
          setBusy(true)
          try {
            const payload = {
              baseUrl: draft.baseUrl,
              outputDir: draft.outputDir,
              settleDelay: Number(draft.settleDelay) || 0,
              simplify: options.simplify,
            }
            if (draft.apiKey) payload.apiKey = draft.apiKey
            const value = await jsonFetch('/tiiny-3d/settings', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            })
            setSettings(value)
            setDraft((current) => ({ ...current, apiKey: '', baseUrl: value.baseUrl, outputDir: value.outputDir, settleDelay: value.settleDelay }))
            setError('')
            const probe = await loadStatus()
            if (probe?.ok || probe?.authorized) setShowSettings(false)
          } catch (failure) {
            setError(String(failure?.message || failure))
          } finally {
            setBusy(false)
          }
        }, [draft, options, loadStatus])

        const startRun = useCallback(async () => {
          if (!image) {
            setError(t('needImage'))
            return
          }
          if (!apiKeyReady) {
            setError(t('needKeyFirst'))
            openSettings(true)
            return
          }
          setError('')
          setBusy(true)
          try {
            const extrasPayload = {}
            for (const group of status?.paramGroups || []) {
              for (const param of group.params) {
                const key = `${group.stage}:${param.name}`
                if (!extrasEnabled[key]) continue
                const value = extras[key]
                if (value === undefined || value === '' || value === null) continue
                const typed = param.type === 'number' ? Number(value) : param.type === 'boolean' ? Boolean(value) : value
                extrasPayload[group.stage] = { ...(extrasPayload[group.stage] || {}), [param.name]: typed }
              }
            }
            const body = await jsonFetch('/tiiny-3d/generate', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                imageDataUrl: image.dataUrl,
                imageName: image.name,
                preset,
                seed: Math.max(0, Math.round(Number(seed) || 0)),
                options: { simplify: options.simplify, settleDelay: Number(options.settleDelay) || 0, polish: options.polish },
                extras: extrasPayload,
              }),
            })
            setRun(body.run)
            setPreviewStage('shape')
            setHistoryPreview('')
          } catch (failure) {
            setError(String(failure?.message || failure))
            setBusy(false)
          }
        }, [image, apiKeyReady, preset, seed, extras, extrasEnabled, options, status, t, openSettings])

        const cancelRun = useCallback(async () => {
          setCancelBusy(true)
          try {
            const body = await jsonFetch('/tiiny-3d/cancel', { method: 'POST' })
            if (body?.run) setRun(body.run)
          } catch (failure) {
            setError(String(failure?.message || failure))
          } finally {
            setCancelBusy(false)
          }
        }, [])

        const renameRun = useCallback(
          async (id) => {
            const name = historyDraft.trim()
            if (!name || historyBusy) return
            setHistoryBusy(id)
            setHistoryError('')
            try {
              const body = await jsonFetch('/tiiny-3d/rename-run', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id, name }),
              })
              setHistory((current) => current.map((item) => (item.id === id ? { ...item, final: body.final } : item)))
              setRun((current) => current?.id === id ? { ...current, final: body.final } : current)
              setHistoryPreview((current) => isHistoryPreviewFor(current, id) ? historyFileUrl({ id, final: body.final }) : current)
              setHistoryEditing('')
            } catch (failure) {
              setHistoryError(String(failure?.message || failure))
            } finally {
              setHistoryBusy('')
            }
          },
          [historyDraft, historyBusy],
        )

        const deleteRun = useCallback(async (id) => {
          if (historyBusy) return
          setHistoryBusy(id)
          setHistoryError('')
          try {
            await jsonFetch('/tiiny-3d/delete-run', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id }),
            })
            setHistory((current) => current.filter((item) => item.id !== id))
            setRun((current) => current?.id === id ? null : current)
            setHistoryConfirm('')
            setHistoryPreview((current) => isHistoryPreviewFor(current, id) ? '' : current)
          } catch (failure) {
            setHistoryError(String(failure?.message || failure))
          } finally {
            setHistoryBusy('')
          }
        }, [historyBusy])

        const revealRun = useCallback(async (id) => {
          if (historyBusy) return
          setHistoryBusy(id)
          setHistoryError('')
          try {
            await jsonFetch('/tiiny-3d/reveal-run', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id }),
            })
          } catch (failure) {
            setHistoryError(String(failure?.message || failure))
          } finally {
            setHistoryBusy('')
          }
        }, [historyBusy])

        const clearFailedRuns = useCallback(async () => {
          if (historyBusy) return
          setHistoryBusy('__failed__')
          setHistoryError('')
          try {
            const body = await jsonFetch('/tiiny-3d/delete-failed', { method: 'POST' })
            const next = await jsonFetch('/tiiny-3d/history')
            setHistory(Array.isArray(next?.runs) ? next.runs : [])
            const removed = new Set(body?.removedIds || [])
            setRun((current) => current && removed.has(current.id) ? null : current)
            setHistoryPreview((current) => [...removed].some((id) => isHistoryPreviewFor(current, id)) ? '' : current)
            setHistoryConfirm('')
            if (body?.failures?.length) setHistoryError(t('deleteFailed'))
          } catch (failure) {
            setHistoryError(String(failure?.message || failure))
          } finally {
            setHistoryBusy('')
          }
        }, [historyBusy, t])

        const copyFinalPath = useCallback(async () => {
          const path = run?.final?.path
          if (!path) return
          setCopyError('')
          setCopiedPath('')
          try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
            await navigator.clipboard.writeText(path)
            setCopiedPath(path)
          } catch {
            setCopyError(t('copyFailed'))
          }
        }, [run?.final?.path, t])

        const skipSettle = useCallback(async () => {
          try {
            const body = await jsonFetch('/tiiny-3d/skip-settle', { method: 'POST' })
            if (body?.run) setRun(body.run)
          } catch {
            /* the wait may have already finished */
          }
        }, [])

        const resumeRun = useCallback(async () => {
          try {
            const body = await jsonFetch('/tiiny-3d/resume', { method: 'POST' })
            if (body?.run) setRun(body.run)
          } catch (failure) {
            setError(String(failure?.message || failure))
          }
        }, [])

        const runStage = useCallback(
          async (stage) => {
            setError('')
            setBusy(true)
            try {
              const body = await jsonFetch('/tiiny-3d/stage', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ stage, runId: run?.id }),
              })
              if (body?.run) {
                setRun(body.run)
                setHistoryPreview('')
                setPreviewStage(stage === 'texture'
                  ? (body.run.stages?.simplify?.status === 'completed' ? 'simplify' : 'shape')
                  : stage)
              }
            } catch (failure) {
              setError(String(failure?.message || failure))
              setBusy(false)
            }
          },
          [run?.id],
        )

        const simplifyInPlan = Boolean(run?.plan?.includes('simplify') || options.simplify)
        const visibleStages = ['shape', 'simplify', 'texture', 'export']

        const stageLabel = (stage) => t(`stage${stage.charAt(0).toUpperCase()}${stage.slice(1)}`)
        const stageHint = (stage) => t(`stage${stage.charAt(0).toUpperCase()}${stage.slice(1)}Hint`)
        const statusLabel = (value) => {
          const map = {
            pending: 'stagePending',
            running: 'stageRunning',
            cancelling: 'stageCancelling',
            completed: 'stageCompleted',
            failed: 'stageFailed',
            cancelled: 'stageCancelled',
            skipped: 'stageSkipped',
            waiting: 'stageWaiting',
          }
          return t(map[value] || 'stagePending')
        }

        const prereqOk = (stage) => {
          if (!run) return false
          if (stage === 'shape') return Boolean(image || run.image?.file)
          if (stage === 'simplify') return stageRecords.shape?.status === 'completed'
          if (stage === 'texture') return stageRecords.shape?.status === 'completed'
          if (stage === 'export') return stageRecords.texture?.status === 'completed'
          return false
        }

        const previewOptions = useMemo(() => {
          const list = []
          if (run?.stages?.shape?.url) list.push(['shape', t('previewShape')])
          if (run?.stages?.simplify?.url) list.push(['simplify', t('previewSimplify')])
          if (run?.stages?.export?.url) list.push(['export', t('previewExport')])
          return list
        }, [run, t])

        const previewUrl = useMemo(() => {
          if (historyPreview) return historyPreview
          const record = run?.stages?.[previewStage]
          return record?.url || ''
        }, [historyPreview, run, previewStage])

        const connection = (() => {
          if (!status) return { tone: '', label: t('connecting'), fixable: true }
          const problem = status.problem || ''
          if (status.reachable === false || problem === 'unreachable') return { tone: 'err', label: t('unreachable'), fixable: true }
          if (status.ok) return { tone: 'ok', label: t('connected'), fixable: false }
          if (problem === 'no-key' || !settings?.hasApiKey) return { tone: 'warn', label: t('noKey'), fixable: true }
          if (problem === 'base-url') return { tone: 'err', label: t('badBaseUrl'), fixable: true }
          if (problem === 'bad-key' || (status.authorized === false && problem !== 'no-model')) return { tone: 'warn', label: t('badKey'), fixable: true }
          return { tone: 'warn', label: t('noModel'), fixable: false }
        })()

        const PRESET_PARAMS = new Set(['output_precision', 'inference_quality', 'asset_quality', 'seed', 'texture_size', 'supersample', 'target_faces'])
        const extrasGroups = (status?.paramGroups || [])
          .map((group) => ({ ...group, params: group.params.filter((param) => !PRESET_PARAMS.has(param.name)) }))
          .filter((group) => group.params.length)

        const renderSettings = () =>
          showSettings
            ? h(
                'div',
                { className: 't3d-card' },
                h(
                  'div',
                  { className: 't3d-card-head' },
                  t('connection'),
                  h('span', { style: { flex: 1 } }),
                  h('button', { type: 'button', className: 't3d-btn sm ghost', onClick: () => setShowSettings(false) }, t('close')),
                ),
                h(
                  'div',
                  { className: 't3d-card-body' },
                  h(
                    'div',
                    { className: 't3d-field' },
                    h('div', { className: 't3d-label' }, t('baseUrl')),
                    h('input', {
                      className: 't3d-input',
                      value: draft.baseUrl,
                      placeholder: 'http://api.tiiny/v1',
                      onChange: (event) => setDraft({ ...draft, baseUrl: event.target.value }),
                    }),
                  ),
                  h(
                    'div',
                    { className: 't3d-field' },
                    h('div', { className: 't3d-label' }, t('apiKey')),
                    h('input', {
                      ref: keyInputRef,
                      className: 't3d-input',
                      type: 'password',
                      autoComplete: 'off',
                      value: draft.apiKey,
                      placeholder: settings?.hasApiKey ? t('apiKeySet') : 'Bearer token',
                      onChange: (event) => setDraft({ ...draft, apiKey: event.target.value }),
                    }),
                    h('div', { className: 't3d-meta' }, status?.reachable ? t('apiKeySet') : 'TiinyOS → Settings → API Key'),
                  ),
                  h(
                    'div',
                    { className: 't3d-field' },
                    h('div', { className: 't3d-label' }, t('outputDir')),
                    h('input', {
                      className: 't3d-input',
                      value: draft.outputDir,
                      onChange: (event) => setDraft({ ...draft, outputDir: event.target.value }),
                    }),
                    h('div', { className: 't3d-meta' }, t('outputDirHint')),
                  ),
                  h(
                    'div',
                    { className: 't3d-field' },
                    h('div', { className: 't3d-label' }, t('settleDelay')),
                    h('input', {
                      className: 't3d-number',
                      type: 'number',
                      min: 0,
                      max: 300,
                      value: draft.settleDelay,
                      onChange: (event) => setDraft({ ...draft, settleDelay: Number(event.target.value) })},
                    ),
                    h('div', { className: 't3d-meta' }, t('settleHint')),
                  ),
                  h(
                    'div',
                    { className: 't3d-row' },
                    h('button', { type: 'button', className: 't3d-btn primary', disabled: busy, onClick: saveSettings }, busy ? t('saving') : t('save')),
                    h('button', { type: 'button', className: 't3d-btn ghost', onClick: () => loadStatus() }, t('refresh')),
                  ),
                ),
              )
            : null

        const renderStageRow = (stage, index) => {
          const record = stageRecords[stage]
          const optional = stage === 'simplify'
          const included = !run ? (stage === 'simplify' ? options.simplify : true) : run.plan?.includes(stage)
          const state = record?.cancelPending ? 'cancelling' : record?.waiting ? 'waiting' : record?.status || (included === false ? 'skipped' : 'pending')
          const live = state === 'running' || state === 'waiting' || state === 'cancelling'
          const progress = state === 'completed' ? 100 : live ? Math.max(3, Number(record?.progress) || 0) : 0
          return h(
            'div',
            { className: `t3d-stage ${live ? 'active' : ''}`, key: stage },
            h(
              'div',
              { className: 't3d-stage-top' },
              h('div', { className: 't3d-idx' }, String(index + 1)),
              h('div', { className: 't3d-stage-name', style: included === false ? { opacity: 0.55 } : undefined }, stageLabel(stage)),
              optional ? h('span', { className: 't3d-badge' }, t('optional')) : null,
              h('div', { className: 't3d-stage-hint' }, stageHint(stage)),
              h('span', { className: `t3d-badge ${state}` }, statusLabel(state)),
            ),
            h('div', { className: 't3d-bar' }, h('i', { style: { width: `${progress}%` } })),
            h(
              'div',
              { className: 't3d-stage-foot' },
              h(
                'span',
                { className: 'grow', title: record?.cancelError || record?.deviceError || record?.error || record?.file || '' },
                record?.cancelError || (record?.file ? `${record.file} · ${fmtBytes(record.bytes)}` : record?.deviceError || record?.error || ''),
              ),
              record?.ms ? h('span', null, fmtMs(record.ms)) : null,
              run
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 't3d-btn sm ghost',
                      disabled: running || busy || !prereqOk(stage),
                      title: prereqOk(stage) ? '' : t('needsInput'),
                      onClick: () => runStage(stage),
                    },
                    record?.status === 'completed' ? t('rerunStage') : t('runStage'),
                  )
                : null,
            ),
          )
        }

        const renderHistoryEntry = (entry) => {
          const editing = historyEditing === entry.id
          const confirming = historyConfirm === entry.id
          const locked = Boolean(historyBusy) || entry.status === 'running' || (running && run.id === entry.id)
          const button = (label, onClick, extra = {}) => h('button', {
            type: 'button', className: 't3d-btn sm ghost', disabled: locked, onClick, ...extra,
          }, label)
          const actions = editing
            ? [
                button(t('save'), () => renameRun(entry.id), { disabled: locked || !historyDraft.trim() }),
                button(t('cancel'), () => setHistoryEditing('')),
              ]
            : confirming
              ? [
                  button(t('removeConfirm'), () => deleteRun(entry.id), { style: { color: 'var(--dsw-alias-state-warn-primary)' } }),
                  button(t('cancel'), () => setHistoryConfirm('')),
                ]
              : [
                  entry.final?.file ? button(t('rename'), () => {
                    setHistoryError('')
                    setHistoryConfirm('')
                    setHistoryEditing(entry.id)
                    setHistoryDraft(String(entry.final.file).replace(/\.[a-z0-9]+$/i, ''))
                  }, { title: t('renameHint') }) : null,
                  entry.final?.file ? button(t('reveal'), () => revealRun(entry.id), { title: t('revealHint') }) : null,
                  button(t('remove'), () => {
                    setHistoryError('')
                    setHistoryConfirm(entry.id)
                  }, { title: t('removeHint') }),
                ]
          return h('div', { className: 't3d-history-item', key: entry.id },
            h('span', { className: 'when' }, fmtClock(entry.finishedAt || entry.createdAt)),
            editing
              ? h('input', {
                  className: 't3d-input what', value: historyDraft, autoFocus: true,
                  disabled: locked, 'aria-label': t('renameHint'),
                  onChange: (event) => setHistoryDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') { event.preventDefault(); renameRun(entry.id) }
                    else if (event.key === 'Escape' && !historyBusy) setHistoryEditing('')
                  },
                })
              : h('button', {
                  type: 'button', className: 'what', disabled: !entry.final?.file || locked,
                  title: entry.final?.path || entry.error || '',
                  onClick: () => { if (entry.final?.file) setHistoryPreview(historyFileUrl(entry)) },
                }, entry.final?.file || statusLabel(entry.status)),
            h('span', { className: 'size' }, entry.final?.bytes ? fmtBytes(entry.final.bytes) : ''),
            h('div', { className: 't3d-history-actions' }, ...actions),
          )
        }

        const imageUrl = image?.dataUrl || ''
        const blockedEntry = Object.entries(stageRecords).find(([, record]) => record?.needsReset)
        const waitingEntry = Object.entries(stageRecords).find(([, record]) => record?.waiting)

        return h(
          'div',
          { className: 't3d-page', lang: 'en' },
          h(
            'div',
            { className: 't3d-head' },
            h('div', { className: 't3d-head-mark' }, h(Icon, { size: 18 })),
            h(
              'div',
              { className: 't3d-head-text' },
              h('div', { className: 't3d-head-title' }, t('title')),
              h('div', { className: 't3d-head-sub' }, status?.model ? `${status.model} · ${t('subtitle')}` : t('subtitle')),
            ),
            h('div', { className: 't3d-head-spacer' }),
            connection.fixable
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 't3d-chip action',
                    title: status?.error || t('keyNeeded'),
                    onClick: () => openSettings(true),
                  },
                  h('i', { className: `t3d-dot ${connection.tone}` }),
                  connection.label,
                  h('span', { className: 't3d-arrow' }, '▸'),
                )
              : h(
                  'div',
                  { className: 't3d-chip', title: status?.error || '' },
                  h('i', { className: `t3d-dot ${connection.tone}` }),
                  connection.label,
                  status?.version?.version ? ` · ${status.version.version}` : '',
                ),
            h('button', { type: 'button', className: 't3d-btn ghost', onClick: () => loadStatus(), disabled: statusBusy }, statusBusy ? t('connecting') : t('refresh')),
            h('button', { type: 'button', className: `t3d-btn ${showSettings ? 'primary' : 'ghost'}`, onClick: () => setShowSettings((value) => !value) }, t('settings')),
          ),
          h(
            'div',
            { className: 't3d-body' },
            h(
              'div',
              { className: 't3d-col left', ref: leftColRef },
              renderSettings(),
              h(
                'div',
                { className: 't3d-card' },
                h('div', { className: 't3d-card-head' }, t('image')),
                h(
                  'div',
                  { className: 't3d-card-body' },
                  h(
                    'div',
                    {
                      className: `t3d-drop ${over ? 'over' : ''}`,
                      role: 'button', tabIndex: 0, 'aria-label': t('dropImage'),
                      onKeyDown: (event) => {
                        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          fileInput.current?.click()
                        }
                      },
                      onClick: () => fileInput.current?.click(),
                      onDragOver: (event) => {
                        event.preventDefault()
                        setOver(true)
                      },
                      onDragLeave: () => setOver(false),
                      onDrop: (event) => {
                        event.preventDefault()
                        setOver(false)
                        const file = event.dataTransfer?.files?.[0]
                        if (file) void pickFile(file)
                      },
                    },
                    imageUrl ? h('img', { src: imageUrl, alt: '' }) : h('div', { className: 't3d-drop-hint' }, t('dropImage')),
                  ),
                  h('input', {
                    ref: fileInput,
                    type: 'file',
                    accept: 'image/png,image/jpeg,image/webp',
                    style: { display: 'none' },
                    onChange: (event) => {
                      const file = event.target.files?.[0]
                      if (file) void pickFile(file)
                      event.target.value = ''
                    },
                  }),
                  h(
                    'div',
                    { className: 't3d-row' },
                    imageUrl ? h('button', { type: 'button', className: 't3d-btn ghost', onClick: () => setImage(null) }, t('clearImage')) : null,
                    image?.name ? h('span', { className: 't3d-meta', style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, image.name) : null,
                  ),
                  h('div', { className: 't3d-meta' }, t('imageHint')),
                ),
              ),
              h(
                'div',
                { className: 't3d-card' },
                h('div', { className: 't3d-card-head' }, t('generation')),
                h(
                  'div',
                  { className: 't3d-card-body' },
                  h(
                    'div',
                    { className: 't3d-field' },
                    h('div', { className: 't3d-label' }, t('qualityLabel')),
                    h(
                      'div',
                      { className: 't3d-seg' },
                      ...['fast', 'balance', 'quality'].map((value) =>
                        h(
                          'button',
                          {
                            key: value,
                            type: 'button',
                            className: preset === value ? 'on' : '',
                            onClick: () => setPreset(value),
                          },
                          t(value === 'fast' ? 'presetFast' : value === 'balance' ? 'presetBalance' : 'presetQuality'),
                        ),
                      ),
                    ),
                    h(
                      'div',
                      { className: 't3d-meta' },
                      t(preset === 'fast' ? 'presetFastHint' : preset === 'balance' ? 'presetBalanceHint' : 'presetQualityHint'),
                    ),
                  ),
                  h(
                    'div',
                    { className: 't3d-row' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 't3d-btn primary block',
                        disabled: running || busy || !imageUrl || !apiKeyReady,
                        title: !apiKeyReady ? t('needKeyFirst') : !imageUrl ? t('needImage') : '',
                        onClick: () => startRun()},
                      running ? (cancelling ? t('cancelling') : t('generating')) : t('generate'),
                    ),
                  ),
                  running
                    ? h(
                        'div',
                        { className: 't3d-row' },
                        h('button', { type: 'button', className: 't3d-btn ghost', disabled: cancelBusy || cancelling, onClick: () => cancelRun() }, cancelBusy || cancelling ? t('cancelling') : t('cancelRun')),
                        run?.phase === 'settle' ? h('button', { type: 'button', className: 't3d-btn ghost', onClick: () => skipSettle() }, t('skipSettle')) : null,
                      )
                    : null,
                  cancelling ? h('div', { className: 't3d-warn', role: 'status' }, t('cancelPendingHint')) : null,
                  error ? h('div', { className: 't3d-error', role: 'alert' }, error) : null,
                  !apiKeyReady && !showSettings
                    ? h(
                        'button',
                        { type: 'button', className: 't3d-cta', onClick: () => openSettings(true), title: t('needKeyFirst') },
                        h('span', { className: 't3d-cta-title' }, t('keyNeeded')),
                        h('span', { className: 't3d-cta-action' }, `${t('addKey')} ▸`),
                      )
                    : null,
                  h(
                    'button',
                    { type: 'button', className: 't3d-btn ghost block', onClick: () => setShowAdvanced((value) => !value) },
                    showAdvanced ? t('advancedHide') : t('advancedShow'),
                  ),
                  showAdvanced
                    ? h(
                        'div',
                        { className: 't3d-field' },
                        h(
                          'div',
                          { className: 't3d-row' },
                          h(
                            'div',
                            { className: 't3d-field' },
                            h('div', { className: 't3d-label' }, t('seed')),
                            h(
                              'div',
                              { className: 't3d-row' },
                              h('input', {
                                className: 't3d-number',
                                type: 'number',
                                value: seed,
                                style: { width: '100%' },
                                onChange: (event) => setSeed(Number(event.target.value))},
                              ),
                              h('button', { type: 'button', className: 't3d-btn sm', onClick: () => setSeed(Math.floor(Math.random() * 1000000)) }, '🎲'),
                            ),
                          ),
                          h(
                            'div',
                            { className: 't3d-field' },
                            h('div', { className: 't3d-label' }, t('settleDelay')),
                            h('input', {
                              className: 't3d-number',
                              type: 'number',
                              min: 0,
                              max: 300,
                              value: options.settleDelay,
                              onChange: (event) => setOptions({ ...options, settleDelay: Number(event.target.value) })},
                            ),
                          ),
                        ),
                        h(
                          'label',
                          { className: 't3d-switch' },
                          h('input', { type: 'checkbox', checked: options.simplify, onChange: (event) => setOptions({ ...options, simplify: event.target.checked }) }),
                          t('runSimplify'),
                        ),
                        h(
                          'label',
                          { className: 't3d-switch' },
                          h('input', { type: 'checkbox', checked: options.polish, onChange: (event) => setOptions({ ...options, polish: event.target.checked }) }),
                          t('runPolish'),
                        ),
                        h('div', { className: 't3d-meta' }, `${t('simplifyHint')} · ${t('settleHint')} · ${t('polishHint')}`),
                      )
                    : null,
                  showAdvanced && extrasGroups.length
                    ? h(
                        'div',
                        { className: 't3d-field' },
                        h('div', { className: 't3d-label' }, t('extraOptions')),
                        h('div', { className: 't3d-meta' }, t('extraHint')),
                        ...extrasGroups.map((group) =>
                          h(
                            'div',
                            { key: group.stage, className: 't3d-field', style: { gap: 6, marginTop: 4 } },
                            h('div', { className: 't3d-meta' }, stageLabel(group.stage)),
                            ...group.params.map((param) => {
                              const key = `${group.stage}:${param.name}`
                              const enabled = Boolean(extrasEnabled[key])
                              const control =
                                param.type === 'enum' && param.options
                                  ? h(
                                      'select',
                                      {
                                        className: 't3d-select',
                                        style: { width: 118 },
                                        disabled: !enabled,
                                        value: extras[key] ?? param.default ?? param.options[0],
                                        onChange: (event) => setExtras({ ...extras, [key]: event.target.value })},
                                      param.options.map((option) => h('option', { key: option, value: option }, option)),
                                    )
                                  : param.type === 'boolean'
                                    ? h('input', {
                                        type: 'checkbox',
                                        disabled: !enabled,
                                        checked: Boolean(extras[key]),
                                        onChange: (event) => setExtras({ ...extras, [key]: event.target.checked })},
                                      )
                                    : h('input', {
                                        className: 't3d-number',
                                        style: { width: 118 },
                                        type: param.type === 'number' ? 'number' : 'text',
                                        disabled: !enabled,
                                        value: extras[key] ?? param.default ?? '',
                                        title: param.description || '',
                                        onChange: (event) => setExtras({ ...extras, [key]: event.target.value })},
                                      )
                              return h(
                                'div',
                                { className: 't3d-row', key },
                                h(
                                  'label',
                                  { className: 't3d-switch', style: { flex: 1, minWidth: 140 } },
                                  h('input', {
                                    type: 'checkbox',
                                    checked: enabled,
                                    onChange: (event) => setExtrasEnabled({ ...extrasEnabled, [key]: event.target.checked })},
                                  ),
                                  param.name,
                                ),
                                control,
                              )
                            }),
                          ),
                        ),
                      )
                    : null,
                ),
              ),
              h(
                'div',
                { className: 't3d-card' },
                h(
                  'div',
                  { className: 't3d-card-head' },
                  h('button', {
                    type: 'button', className: 't3d-btn sm ghost', 'aria-expanded': showHistory,
                    onClick: () => setShowHistory((value) => !value),
                  }, `${showHistory ? '−' : '+'} ${t('history')}${history.length ? ` (${history.length})` : ''}`),
                  h('span', { style: { flex: 1 } }),
                  history.some((entry) => ['failed', 'cancelled'].includes(entry.status))
                    ? h('button', {
                        type: 'button', className: 't3d-btn sm ghost', disabled: Boolean(historyBusy),
                        onClick: () => {
                          if (historyConfirm === '__failed__') clearFailedRuns()
                          else setHistoryConfirm('__failed__')
                        },
                      }, historyConfirm === '__failed__' ? t('removeConfirm') : t('clearFailed'))
                    : null,
                  historyConfirm === '__failed__'
                    ? h('button', { type: 'button', className: 't3d-btn sm ghost', disabled: Boolean(historyBusy), onClick: () => setHistoryConfirm('') }, t('cancel'))
                    : null,
                ),
                historyError ? h('div', { className: 't3d-card-body' }, h('div', { className: 't3d-error', role: 'alert' }, historyError)) : null,
                showHistory
                  ? h('div', { className: 't3d-card-body', style: { gap: 6 } },
                      history.length
                        ? h('div', { className: 't3d-history' }, ...history.map(renderHistoryEntry))
                        : h('div', { className: 't3d-empty' }, t('noHistory')),
                    )
                  : null,
              ),
            ),
            h(
              'div',
              { className: 't3d-col right' },
                  status?.error && !running
                    ? h(
                        'div',
                        { className: 't3d-warn', role: 'status', style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                        h('span', { style: { flex: 1 } }, status.error),
                        status.launchable && status.problem === 'no-model'
                          ? h(
                              'button',
                              { type: 'button', className: 't3d-btn sm', disabled: launching, onClick: launchDeviceModel },
                              launching ? t('launching') : `${t('launchModel')}${status.launchable.name ? ` (${status.launchable.name})` : ''}`,
                            )
                          : null,
                      )
                    : null,
              h(
                'div',
                { className: 't3d-card' },
                h(
                  'div',
                  { className: 't3d-card-head' },
                  t('pipeline'),
                  h('span', { style: { flex: 1 } }),
                  run
                    ? h(
                        'span',
                        { className: 't3d-meta' },
                        `${t('totalTime')} ${fmtMs((run.finishedAt || Date.now()) - run.createdAt)} · ${run.progress || 0}%`,
                      )
                    : null,
                ),
                h(
                  'div',
                  { className: 't3d-card-body', style: { gap: 8 } },
                  ...visibleStages
                    .filter((stage) => stage !== 'simplify' || simplifyInPlan)
                    .map((stage, index) => renderStageRow(stage, index)),
                  blockedEntry && !cancelling
                    ? h(
                        'div',
                        { className: 't3d-warn', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                        h('span', null, t('waitingManual', { detail: blockedEntry[1].deviceError || blockedEntry[1].error || '' })),
                        h(
                          'div',
                          { className: 't3d-row' },
                          h('button', { type: 'button', className: 't3d-btn sm', disabled: cancelBusy || cancelling, onClick: () => resumeRun() }, t('resume')),
                          h('button', { type: 'button', className: 't3d-btn sm ghost', disabled: cancelBusy || cancelling, onClick: () => cancelRun() }, cancelBusy || cancelling ? t('cancelling') : t('cancelRun')),
                        ),
                      )
                    : waitingEntry && !cancelling
                      ? h('div', { className: 't3d-meta' }, t('waitingAuto', { detail: waitingEntry[1].deviceError || waitingEntry[1].error || '' }))
                      : null,
                ),
              ),
              h(
                'div',
                { className: 't3d-card' },
                h(
                  'div',
                  { className: 't3d-card-head' },
                  t('preview'),
                  h('span', { style: { flex: 1 } }),
                  h(
                    'div',
                    { className: 't3d-tabs' },
                    ...previewOptions.map(([value, label]) =>
                      h(
                        'button',
                        {
                          key: value,
                          type: 'button',
                          className: `t3d-tab ${previewStage === value && !historyPreview ? 'on' : ''}`,
                          onClick: () => {
                            setPreviewStage(value)
                            setHistoryPreview('')
                          }},
                        label,
                      ),
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 't3d-card-body' },
                  h(GlbPreview, { url: previewUrl, t }),
                  h('div', { className: 't3d-meta t3d-preview-help' }, t('previewHint')),
                ),
              ),
              !run
                ? null
                : h(
                'div',
                { className: 't3d-card' },
                h(
                  'div',
                  { className: 't3d-card-head' },
                  t('result'),
                  run?.final ? h('span', { className: 't3d-meta t3d-artifact-path', title: run.final.path }, run.final.path) : null,
                  run?.final
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 't3d-btn sm ghost',
                          onClick: copyFinalPath,
                        },
                        copiedPath === run.final.path ? t('copied') : t('copyPath'),
                      )
                    : null,
                ),
                h(
                  'div',
                  { className: 't3d-card-body' },
                  run?.final
                    ? h(
                        'div',
                        { className: 't3d-file' },
                        h('span', { className: 'name', style: { fontWeight: 600 } }, run.final.file),
                        h('span', { className: 'size' }, fmtBytes(run.final.bytes)),
                        h(
                          'a',
                          { className: 't3d-link', href: `/tiiny-3d/file?run=${encodeURIComponent(run.id)}&name=${encodeURIComponent(run.final.file)}`, download: run.final.file },
                          t('download'),
                        ),
                      )
                    : null,
                  h(
                    'div',
                    { className: 't3d-files' },
                    ...['background', 'shape', 'simplify', 'texture', 'export']
                      .filter((stage) => stageRecords[stage]?.file)
                      .map((stage) =>
                        h(
                          'div',
                          { className: 't3d-file', key: stage },
                          h('span', { className: 'size' }, stageLabel(stage)),
                          h('span', { className: 'name' }, stageRecords[stage].file),
                          h('span', { className: 'size' }, fmtBytes(stageRecords[stage].bytes)),
                          h(
                            'a',
                            { className: 't3d-link', href: stageRecords[stage].url, download: stageRecords[stage].file },
                            t('download'),
                          ),
                        ),
                      ),
                  ),
                  !run?.final && !Object.values(stageRecords).some((record) => record?.file)
                    ? h('div', { className: 't3d-empty' }, t('noArtifacts'))
                    : null,
                  copyError ? h('div', { className: 't3d-error', role: 'alert' }, copyError) : null,
                  run?.error ? h('div', { className: 't3d-error', role: 'alert' }, run.error) : null,
                ),
              ),
              h(
                'div',
                { className: 't3d-card' },
                h(
                  'div',
                  { className: 't3d-card-head', style: { cursor: 'pointer' }, onClick: () => setShowLog((value) => !value) },
                  t('log'),
                  h('span', { style: { flex: 1 } }),
                  h('span', { className: 't3d-meta' }, showLog ? '−' : '+'),
                ),
                showLog
                  ? h(
                      'div',
                      { className: 't3d-card-body', style: { paddingTop: 8 } },
                      h(
                        'div',
                        { className: 't3d-log', ref: logRef },
                        ...(run?.log || []).map((line, index) =>
                          h(
                            'div',
                            { key: index, className: line.level || 'info' },
                            h('span', { className: 't' }, new Date(line.t).toLocaleTimeString('en-GB', { hour12: false })),
                            line.text,
                          ),
                        ),
                        !run?.log?.length ? h('div', { className: 't3d-meta' }, '—') : null,
                      ),
                    )
                  : null,
              ),
            ),
          ),
        )
      }
    }

    function Icon({ size = 20 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M12 2.8 21 7.6v8.8L12 21.2 3 16.4V7.6L12 2.8Z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M3.4 7.7 12 12.2l8.6-4.5M12 12.2v8.6', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round', opacity: 0.9 }),
      )
    }

    function PanelIcon({ size = 20, active = false }) {
      return h(Icon, { size: Math.max(16, Number(size) || 20), active })
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => {
          if (typeof styles !== 'undefined' && styles.insert) return styles.insert(CSS)
          const element = document.createElement('style')
          element.textContent = CSS
          document.head.appendChild(element)
          return () => element.remove()
        })
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'tiiny-3d' }, Panel(ctx)))
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: 'tiiny-3d', order: 21, label: () => 'Tiiny 3D' }, PanelIcon),
        )
      },
    }
  },
})
