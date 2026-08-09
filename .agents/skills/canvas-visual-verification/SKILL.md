---
name: canvas-visual-verification
description: Use Playwright MCP Vision Mode to visually inspect and interact with this repository's Canvas/WebGL UI. Use for screenshot-based Canvas checks, coordinate input, and browser error reporting.
---

# Canvas visual verification

1. Check that both submodules are initialized. If not, stop and request the required repository-specific authorization.
2. Run `mise run setup` and `mise run visual:setup`.
3. Run `mise run test:e2e:driver` to establish the automated startup, WebGL2, frame, and zoom baseline.
4. Start `mise run visual:dev` in a persistent terminal session.
5. Poll `http://127.0.0.1:5173` with mise-managed Node until it returns a successful response.
6. Open the URL with Playwright MCP and wait for loading to finish.
7. Take a viewport screenshot and locate the rendered Canvas UI from pixels, not accessibility references.
8. Confirm that the worker reports `Using WebGL2 backend`, and that its resize log and the transferred DOM canvas both have non-zero dimensions. The app transfers control to an `OffscreenCanvas`, so do not call `getContext` again on the DOM canvas.
9. Choose visible targets from the screenshot and exercise representative coordinate operations:
   - click a visible Canvas control;
   - drag a clearly draggable control, divider, or scrollbar;
   - scroll a visible scrollable Canvas region.
10. Take a screenshot after each operation and compare the visible result. Do not use fixed coordinates or assume a particular PoB feature.
11. Read console messages at error level; page errors are included there. Report:
    - URL and viewport;
    - WebGL2 backend and Canvas dimensions;
    - operations and observed visual changes;
    - console/page errors;
    - anything that could not be verified.

Use headless mode by default. To investigate a headless-only discrepancy, restart Codex with `PLAYWRIGHT_MCP_HEADED=1`.
