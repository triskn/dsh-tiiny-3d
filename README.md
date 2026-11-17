# Tiiny 3D for DeepSeek Harness

Turn a reference image into a textured GLB using Hunyuan3D-2.1 on your Tiiny device. The DSH workbench shows each pipeline stage, previews the outputs, and saves the finished model locally.

<img alt="Tiiny 3D icon" src="./icon.svg" width="56" height="56">

## Features

- **Image-to-3D pipeline:** shape generation, optional mesh simplification, texturing, and final GLB export.
- **Stage controls:** inspect progress, rerun a stage, resume a recoverable task, or request cancellation.
- **Quality presets:** Fast, Balanced, and High Quality, with additional parameters drawn from device capabilities.
- **English interface:** connection diagnostics, settings, stage cards, preview controls, and history actions.
- **Interactive preview:** rotate, zoom, reset the view, toggle auto-rotation or points, and switch between available stage outputs.
- **Local file management:** download outputs, rename finished models, and delete unwanted runs after confirmation. Reveal in Finder is available on macOS.
- **Cancellation confirmation:** keep new generation blocked while device cancellation is pending, including reconciliation after a host reload.

The preview uses reduced geometry and a software renderer. Inspect the exported GLB in a dedicated 3D application for full-resolution geometry and PBR materials.

## Requirements

- DeepSeek Harness with the profile bundle and client UI APIs used by this plugin.
- Node.js **20 or later** on the DSH host.
- A reachable Tiiny device with **Tencent/Hunyuan3D-2.1** installed and its Image-to-3D service available under `/v1/3d`.
- A Tiiny API key.

The plugin does not include model weights. Model availability and accepted parameters depend on your device and TiinyOS service build. See [Validation](./VALIDATION.md) for what has and has not been tested.

## Installation

Install directly from GitHub:

```bash
dsh plugin add github:triskn/dsh-tiiny-3d
```

Restart DSH and open **Tiiny 3D** from the sidebar. Open **Settings**, enter your API key and API Base URL, and save.

This publication does not include an npm release.

### Local development installation

```bash
git clone https://github.com/triskn/dsh-tiiny-3d.git
cd dsh-tiiny-3d
```

Locate the DSH profile directory, usually `~/.dsh/profiles/desktop/` on macOS/Linux or `%USERPROFILE%\.dsh\profiles\desktop\` on Windows. Merge the following into its `package.json`, preserving existing entries and replacing the path with your absolute checkout path:

```jsonc
{
  "dependencies": {
    "dsh-tiiny-3d": "link:/absolute/path/to/dsh-tiiny-3d"
  },
  "dsh": {
    "profile": {
      "bundles": [
        // Keep your existing bundles.
        "dsh-tiiny-3d"
      ]
    }
  }
}
```

Run `pnpm install` in that profile directory using DSH's bundled pnpm, then restart DSH.

## Quick start

1. Configure your API key and endpoint. The default API Base URL is `http://api.tiiny/v1`; use a reachable address appropriate to your device.
2. Check the connection status. If no suitable model is running, load Hunyuan3D-2.1 in TiinyOS. The workbench also offers an explicit model-start action when the model-management service is reachable.
3. Choose one reference image and a quality preset. The UI defaults to **High Quality**; use Fast for a shorter first run.
4. Start generation and follow the stage cards. Mesh simplification is optional and disabled by default.
5. Select **Final** when export completes, then download or inspect the saved GLB.

Use a clear image with one complete subject, an uncluttered or transparent background, and soft lighting. The current workflow accepts a single reference image. Background removal is not included in the workbench, so prepare the background before uploading.

## Pipeline and quality

| Stage | Input | Output |
| --- | --- | --- |
| Shape | Reference image | `shape.glb` |
| Simplify (optional) | Shape mesh | `simplified.glb` |
| Texture | Reference image and mesh | Material archive |
| Export | Material archive | `painted.glb` |

The plugin expands its quality presets into the following settings, subject to device capabilities:

| Preset | Precision | Inference / asset quality | Shape steps | Guidance | Texture size | Supersampling |
| --- | --- | --- | --- | --- | --- | --- |
| Fast | `draft` | `fast` | 25 | 5.0 | 1024 | Off |
| Balanced | `standard` | `balance` | 35 | 5.0 | 2048 | On |
| High Quality | `high` | `quality` | 50 | 5.0 | 4096 | On |

Optional simplification targets 120,000 faces by default. Additional parameter overrides appear under **More options**; enable an override before submitting it. These are plugin presets, not a guarantee of output quality, processing time, or support on every device build.

By default, the plugin waits 75 seconds after texturing before export to allow device resources to settle. You can skip the wait or configure a delay from 0 to 300 seconds.

### Export repair

The default export repair adds missing vertex normals and attempts linear-to-sRGB conversion for supported embedded PNG base-color textures. This was introduced for outputs observed on the original device build; it is not a universal correction for every GLB. Disable **Polish export colors** if your service already returns correctly encoded textures. The repair does not reconstruct missing geometry or image details.

## Configuration and data

Settings are stored in `~/.tiiny-3d/settings.json`, outside the installed package. The plugin requests file mode `0600` on systems supporting Unix permissions. Its settings response returns `hasApiKey` instead of the key itself.

| Setting | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://api.tiiny/v1` | Image-to-3D API base URL. |
| `apiKey` | Empty | Device API key. |
| `outputDir` | `~/tiiny-3d` | Directory for finished GLB files. Use an absolute custom path. |
| `settleDelay` | `75` | Seconds to wait before export. |
| `simplify` | `false` | Default mesh simplification setting. |
| `polish` | `true` | Default export repair setting. |

Environment variables provide initial defaults; saved settings take precedence:

| Variable | Purpose |
| --- | --- |
| `TIINY_3D_HOME` | Override the data directory. |
| `TIINY_3D_BASE_URL` | Default Image-to-3D API base URL. |
| `TIINY_API_KEY` | Default API key. |
| `TIINY_MODEL_SERVICE` | Model-management endpoint; defaults to `http://tiiny-model.managed.tiiny`. |

**Model management uses a separate endpoint.** Changing `baseUrl` does not redirect model discovery/start requests. Configure `TIINY_MODEL_SERVICE` when using a different device route, or load the model through TiinyOS instead.

The host sends your image, mesh, and materials to the configured device API, and uses your API key for API and model-management requests. Use endpoints you trust. A remote endpoint has its own data handling policies.

```text
~/.tiiny-3d/
├── settings.json       # Settings; may contain the API key.
├── history.json        # Summaries of up to 40 recent runs.
└── runs/<run-id>/       # Input image, stage artifacts, and run.json.

~/tiiny-3d/              # Finished GLB files, unless configured otherwise.
```

Renaming a finished model changes its filename on disk. Deleting a run removes its workspace, final model, and history entry; the UI asks for confirmation. Failed partial deletions retain the record for follow-up. Workspaces are not automatically cleaned up when they fall outside the recent-history limit.

## Device API

The host calls these endpoints relative to `baseUrl`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/3d/health` | Service health. |
| `GET` | `/3d/models` | Running 3D models. |
| `GET` | `/3d/capabilities` | Stages, inputs, and parameters. |
| `GET` | `/3d/version` | Service/API version. |
| `POST` | `/3d/tasks` | Submit a stage with multipart inputs. |
| `GET` | `/3d/tasks/{id}` | Poll task state and artifacts. |
| `GET` | `/3d/tasks/{id}/artifacts/{artifact-id}` | Download an artifact. |
| `POST` | `/3d/tasks/{id}/pause`, `/resume`, `/cancel` | Control a task. |

The browser panel communicates with host routes under `/tiiny-3d`. Keep the DSH host and its file-management routes within an appropriately protected environment.

## Troubleshooting

- **Device unreachable:** check the address, device power, and network route.
- **Incorrect Base URL:** include the API prefix, normally `/v1`; a health-route 404 is different from a network failure.
- **Invalid key:** confirm the device is online in TiinyOS, then verify the API key.
- **No suitable model running:** load Hunyuan3D-2.1 in TiinyOS or use the explicit model-start action with a reachable model-management endpoint.
- **Device busy / HTTP 429:** wait for the existing task. The workbench does not automatically resubmit an ambiguous generation request.
- **Cancelling:** a control acknowledgement alone is not enough. New generation stays blocked until repeated task queries confirm a terminal state. Query or control errors remain visible.
- **Waiting for device reset:** the plugin makes a limited number of resume attempts, then exposes recovery controls. It does not reboot your device.
- **Unexpected preview colors or missing detail:** inspect the final GLB in a dedicated viewer and check whether export repair is appropriate for your service output.

## Development and validation

No external runtime dependencies are required:

```bash
node --test
node --check index.js
node --check client.js
node --check glb.js
npm pack --dry-run
```

Tests use temporary directories, synthetic GLB fixtures, and a fake device listening on loopback. They do not generate on real hardware. The validation report distinguishes automated coverage, historical device observations, and browser checks still pending.

```text
index.js           # Host routes, device pipeline, and run management.
client.js          # English workbench and software preview renderer.
glb.js             # GLB parsing and export repair helpers.
cordis.patch.yml   # DSH bundle mounting declaration.
locale/            # DSH metadata resources.
test/              # Fake-device and renderer regression tests.
VALIDATION.md      # Test evidence and limitations.
```

## License

[MIT](./LICENSE). Model weights and device services are separate components governed by their own terms.
