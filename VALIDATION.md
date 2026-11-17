# Validation and known limits

## Publication review: 2026-11-17

This report separates automated checks of the publication copy from observations recorded in the original development session. The installed development plugin and real device were not modified for publication.

### Automated checks

Final publication copy: **68 tests passed, 0 failed, 0 cancelled, 0 skipped**, on macOS with Node.js 22.22.3. JavaScript syntax checks and the npm package dry run passed. The suite was rerun after both publication fixes.

The test suite uses temporary data directories, synthetic GLB fixtures, React stubs, pixel buffers, and a fake device bound to loopback. No real API key, device model, or private input image is required.

Coverage includes:

- A complete fake-device shape, texture, and export pipeline, with optional simplification.
- Device health, authentication and model-availability error mapping; explicit model launch against a fake management endpoint.
- Capability fallback, parameter selection, concurrent generation guards, polling failures, and limited recovery attempts.
- Cancellation acknowledgements, transient terminal states, worker status rebound, failed controls/queries, late completion/error, and pending-task reconciliation.
- Unknown submission outcomes recorded without automatic resubmission.
- Local file naming, Unicode download headers, historical model isolation, partial deletion failures, and blocking mutations of active runs.
- GLB container processing, export repair, synthetic preview geometry, texture coordinates, preview caching, and drag-direction calculations.
- English initial UI text and controls through a React stub. These tests do not execute a real browser layout.

Publication checks also include JavaScript syntax validation and `npm pack --dry-run`. The package contains code, locale metadata, documentation and the license; it excludes credentials, generated models, user input images and runtime history. The README is English-only.

### Publication fixes

- Added MIT license text, repository metadata, ignore rules and a CI workflow.
- Released the active-run lock after a local input preparation failure, preserving the error so a later request can run without reloading the host.
- Changed run-state persistence to avoid readers seeing truncated JSON while cancellation progress is saved.
- Replaced local development notes and internal documentation references with public-facing setup and validation documentation.

The CI workflow defines Node.js 20/22 checks on macOS, Windows and Linux. Defining that matrix does not establish that every platform has passed; consult the repository's Actions results for current outcomes.

## Historical device observations

The original development record reports successful reads/downloads of existing generated GLB files, and local observations of export-color and normal repairs. It also records a cancellation incident: the panel marked a run cancelled while the device task was still running. The implementation was changed to retain ownership while cancellation is pending and require repeated terminal query snapshots before allowing a new run.

A later restoration request was reported accepted by the real device and in progress at the end of that session. The final exported result was not established by that record. These are observations from one device/service build, not an independent benchmark or proof of compatibility with every Tiiny build. Publication tests do not extend those observations into fresh hardware validation.

## Checks still pending

- Install this GitHub package into a fresh DSH profile and confirm host/client loading after restart.
- Test generation and final export on the intended Tiiny device and service build.
- Inspect actual browser layout in light/dark themes and narrow/wide panels.
- Verify pointer lifecycle, drag feel, zoom, auto-rotation, reset, file controls and clipboard behavior in the real browser.
- Inspect final full-resolution geometry and PBR materials in a dedicated GLB viewer.

## Known limits and follow-up work

- The current workflow uses one reference image. Background removal is not provided by this workbench.
- Preview geometry is reduced and lighting simplified; software-renderer tests do not establish full PBR fidelity or responsiveness on large models.
- Advanced intersecting-mesh visibility, pointer-ID/lost-capture handling, and full theme-token compliance need further browser review.
- Preview texture-decode failures may require tighter temporary Blob URL cleanup.
- Export color repair assumes the encoding observed on the original device. Disable it when inappropriate for another service build.
- Cancellation confirmation uses a finite observation window, not a guarantee that a backend worker can never report a later state change.
- A custom Image-to-3D API base URL does not change the separate model-management endpoint. Configure `TIINY_MODEL_SERVICE` or manage model loading in TiinyOS.
- Generated workspaces need manual cleanup. History and run records can contain local paths and user filenames; keep them out of public repositories.
