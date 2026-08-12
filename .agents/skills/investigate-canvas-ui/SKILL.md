---
name: investigate-canvas-ui
description: Investigate this repository's Canvas/WebGL UI with Playwright MCP Vision Mode. Use when visual evidence, coordinate input, or browser errors are needed to understand UI state or behavior.
---

# Investigate Canvas UI

1. Identify the UI and state to investigate. Reuse a URL supplied by the user or reported by an already-running development server whenever it can expose that state.
2. When no suitable server is running, choose the narrowest development entry point:
   - use `mise run driver:dev --game <game> --version <version>` for the standalone driver shell;
   - use `mise run web:dev` for landing-page, routing, version-selection, or web-to-driver behavior;
   - add `--pob-cool-asset` only when remote assets are part of the investigation.
3. Start the selected task in a persistent terminal session. Read its `Local:` URL from terminal output; the port is selected dynamically, so do not assume 5173.
4. Do not run setup, asset packing, builds, or tests merely because this skill was invoked. If starting the selected server fails, inspect the error and perform only the missing prerequisite it identifies. Request repository-specific authorization if uninitialized submodules are the blocker.
5. Open the selected URL with Playwright MCP, wait for the relevant state to finish loading, and take a viewport screenshot.
6. Locate Canvas controls and investigation targets from pixels, not accessibility references or assumed coordinates.
7. Perform only the coordinate operations needed to answer the investigation question. Derive each click, drag, or scroll target from the current screenshot, then take another screenshot and compare the visible result.
8. Inspect error-level console messages when diagnosing failures; page errors are included there. For rendering or sizing problems, also confirm the worker backend, resize log, and transferred DOM canvas dimensions. The app transfers control to an `OffscreenCanvas`, so do not call `getContext` again on the DOM canvas.
9. Report:
   - URL and viewport;
   - relevant visual observations and operations;
   - backend and Canvas dimensions when inspected;
   - console and page errors;
   - anything that could not be investigated.

Use headless mode by default. To investigate a headless-only discrepancy, restart Codex with `PLAYWRIGHT_MCP_HEADED=1`.
