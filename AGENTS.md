# Repository guidance

## Project boundaries

- This repository runs upstream Path of Building code in the browser. Keep upstream code in `vendor/` and packed upstream
  assets unmodified; implement browser-specific behavior in this repository's packages.
- The npm workspaces are `packages/dds`, `packages/driver`, `packages/game`, `packages/packer`, and `packages/web`. See
  `README.md` for the user-facing architecture and development overview.
- Do not add dependencies without prior approval. Use the versions and lockfiles managed by `mise` and npm.

## Development workflow

- Use `mise` tasks as the canonical entry points instead of invoking their underlying tools directly.
- Run `mise run setup` once after cloning to install dependencies, initialize submodules, and install repository hooks.
- Run `mise run check` for the fast local validation loop.
- Run `mise run test:driver` for focused driver behavior tests. It is included in `mise run check`.
- Run `mise run test:e2e:driver` when changing driver startup, rendering, input, overlays, or game-version integration.
  This local-only suite uses fixed releases from `asset.pob.cool`; install its Chromium with `mise run visual:setup`.
- Run `mise run check:full` before completing changes that affect builds, package boundaries, WebAssembly, CI, or release
  behavior. This is also the required pull-request validation.
- Use `mise run driver:dev`, `mise run web:dev`, and the other task-specific commands shown by `mise tasks` for manual
  development.
- Keep generated build output out of version control. Regenerate it through the relevant `mise` task.

## Verification

- Match verification effort to the changed behavior. Prefer static checks and focused tests before builds or interactive
  verification.
- For Canvas/WebGL behavior, use the repository's `canvas-visual-verification` skill when it is available. It defines the
  required browser setup, observations, and evidence. Run the automated driver E2E suite first, then use the skill for
  visual behavior that the stable DOM assertions do not cover.
- The DDS file under `packages/dds/src/dds.test.ts` is a manual asset-processing script, not a self-contained automated
  test; do not treat it as coverage or run it without the referenced packed assets.

## Driver overlay styling

- All Tailwind CSS utilities in driver overlay components must use the `pw:` prefix defined in
  `packages/driver/src/js/overlay/overlay.css` (for example, `pw:absolute pw:p-3`). This keeps overlay styles scoped and
  compatible with browsers that do not support CSS layers, including Amazon Silk Browser.
