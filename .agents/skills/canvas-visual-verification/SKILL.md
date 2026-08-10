---
name: canvas-visual-verification
description: Use Playwright MCP Vision Mode to visually inspect and interact with this repository's Canvas/WebGL UI. Use for screenshot-based Canvas checks, coordinate input, and browser error reporting.
---

# Canvas visual verification

1. Check that both submodules are initialized. If not, stop and request the required repository-specific authorization.
2. Run `mise run setup` and `mise run visual:setup`.
3. For local verification, pack every fixed release requested by `mise run test:e2e:driver`; if the command reports missing assets, run each `mise run pack` command it lists. Also pack the requested visual version with `mise run pack --game <game> --tag <version>` when it is not one of those releases. Skip packing only when explicitly using `--pob-cool-asset`.
4. Run `mise run test:e2e:driver` to establish the automated item loading, startup, WebGL2, frame, and zoom baseline. Use `mise run test:e2e:driver --pob-cool-asset` when remote assets are intentionally under test.
5. Start `mise run visual:dev --game <game> --version <version>` in a persistent terminal session for local assets, or add `--pob-cool-asset` to use the same remote source as step 4.
6. Read the `Local:` URL from the persistent terminal output. The port is selected dynamically, so do not assume 5173.
7. Poll that URL with mise-managed Node until it returns a successful response, then open the same URL with Playwright MCP and wait for loading to finish.
8. Take a viewport screenshot and locate the rendered Canvas UI from pixels, not accessibility references.
9. Confirm that the worker reports `Using WebGL2 backend`, and that its resize log and the transferred DOM canvas both have non-zero dimensions. The app transfers control to an `OffscreenCanvas`, so do not call `getContext` again on the DOM canvas.
10. Choose visible targets from the screenshot and exercise representative coordinate operations:
   - click a visible Canvas control;
   - drag a clearly draggable control, divider, or scrollbar;
   - scroll a visible scrollable Canvas region.
11. Take a screenshot after each operation and compare the visible result. Do not use fixed coordinates or assume a particular PoB feature.
12. Read console messages at error level; page errors are included there. Report:
    - URL and viewport;
    - WebGL2 backend and Canvas dimensions;
    - operations and observed visual changes;
    - console/page errors;
    - anything that could not be verified.

Use headless mode by default. To investigate a headless-only discrepancy, restart Codex with `PLAYWRIGHT_MCP_HEADED=1`.
