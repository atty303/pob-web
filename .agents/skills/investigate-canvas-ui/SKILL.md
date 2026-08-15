---
name: investigate-canvas-ui
description: Investigate this repository's Canvas/WebGL UI with Playwright MCP Vision Mode. Use when visual evidence, coordinate input, or browser errors are needed to understand UI state or behavior.
---

# Investigate Canvas UI

1. Record the reported reproduction tuple before changing conditions: exact URL, how that URL was reached (for example, a link click or direct entry), browser and engine versions when relevant, headed or headless mode, production or local origin, asset source, and viewport. Include reported profile or privacy state, page zoom, and device-pixel ratio when they may affect the symptom. Reuse a URL supplied by the user or reported by an already-running development server whenever it can expose that state. Mark unknown or unavailable conditions explicitly; do not treat success under a different tuple as confirmation of the reported fix.
2. Define the user-visible semantic success state and the nearest failed state before testing. Derive load or import expectations from the actual payload or an authoritative reference; a build may legitimately be unnamed or have an empty tree. Use evidence such as the expected current build, class or ascendancy, and allocated passive tree. For a visual layout issue, use an explicit layout contract or known-good reference instead of inferring intent from aesthetics. If no distinguishing expectation is available, stop primary confirmation and report that the success oracle is unavailable. Keep routing, document title, runtime startup, renderer health, and applied build state distinct.
3. If the reported browser, engine, or mode is already known to be unavailable, record the capability boundary before starting a server and perform only a prerequisite identified by existing evidence and allowed by the task. If the exact tuple remains unavailable, stop primary confirmation at that boundary; do not silently substitute another tuple. If browser launch itself is the reported defect, use the general problem-investigation workflow instead of this Canvas UI workflow.
4. When no suitable server is running, choose the narrowest development entry point:
   - use `mise run driver:dev --game <game> --version <version>` for the standalone driver shell;
   - use `mise run web:dev` for landing-page, routing, version-selection, or web-to-driver behavior;
   - add `--pob-cool-asset` only when remote assets are part of the investigation.
5. Start the selected task in a persistent terminal session. Read its `Local:` URL from terminal output; the port is selected dynamically, so do not assume 5173.
6. Do not run setup, asset packing, builds, or tests merely because this skill was invoked. If starting the selected server fails, inspect the error and perform only the missing prerequisite it identifies. Request repository-specific authorization if uninitialized submodules are the blocker.
7. Open the selected URL with Playwright MCP in the reported browser and mode when available. If launch fails, record the exact failure and apply step 3. Within a bounded observation period appropriate to the flow, wait for the relevant request chain and asynchronous model transition to settle into the semantic success state or the nearest failed or stuck state, then take a viewport screenshot. An alternate browser, entry path, or mode can be a useful control experiment but cannot confirm the reported fix. When causal attribution is required, vary one reproduction-tuple dimension at a time; do not require the full cross-product merely to reproduce the primary failure.
8. Locate Canvas controls and investigation targets from pixels, not accessibility references or assumed coordinates.
9. Perform only the coordinate operations needed to answer the investigation question. Derive each click, drag, or scroll target from the current screenshot, then take another screenshot and compare the visible result.
10. Inspect error-level console messages when diagnosing failures; page errors are included there. When Canvas sizing or resize synchronization may participate in the symptom, also confirm the worker backend, resize log, and transferred DOM canvas dimensions. The app transfers control to an `OffscreenCanvas`, so do not call `getContext` again on the DOM canvas.
11. For external load or import failures, inspect each relevant metadata, raw-content, proxy, and any preflight request separately. Record the method, status, response type, and relevant request and response headers; distinguish browser-generated headers from application-supplied headers. Do not require this network investigation for a pure resize, overlay, or other local rendering problem.
12. Interpret intermediate signals narrowly. A redirect or title change establishes routing or metadata progress; a request start establishes neither a usable response nor model application; Canvas creation, dimensions, frames, or draw counts establish renderer activity. None of those alone proves that a build was applied. Confirm the semantic success state defined in step 2.
13. Report:
   - the reproduction tuple, including URL, entry path, browser engine, mode, origin, asset source, and viewport;
   - the semantic success oracle and the observed final state;
   - relevant visual observations and operations;
   - external request and preflight evidence when applicable;
   - backend and Canvas dimensions when inspected;
   - console and page errors;
   - anything that could not be investigated.

Use headless mode by default when the report does not depend on browser mode. To investigate a headed-only discrepancy, restart Codex with `PLAYWRIGHT_MCP_HEADED=1`.
