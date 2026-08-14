# Browser compatibility decisions

This records reviewed SimpleGraphic differences and known unresolved risks.
Remove a reviewed difference when parity is implemented; the tracked upstream
state and commit history are the source of truth for completed synchronization.
This is evidence for later synchronization and browser changes, not permission
to skip current source and Lua-usage checks or to accept an unresolved risk.

Baseline: SimpleGraphic `v2.5.4` at `3b1a3468223d0ebd4042d6ce76fc6144718ef79b`.

## Re-evaluation rule

Re-evaluate an entry when any of these changes:

- PoB Lua calls the API without an existence check or fallback;
- accepted arguments, return values, side effects, or timing become observable;
- browser scaling, rendering, image loading, or frame scheduling is redesigned;
- a new game or release reaches a previously unused path;
- the existing browser replacement no longer preserves the Lua-facing contract.

When an entry changes, record the new evidence and either implement parity or
replace its rationale. Do not advance the upstream state while a newly reachable
incompatibility remains unresolved.

## Reviewed differences

### Draw layer and blend mode queries

- Difference: `GetDrawLayer` and `SetBlendMode` are absent.
- Current rationale: `GetDrawLayer` had no live upstream call at the baseline;
  `SetBlendMode` was not used by current PoB Lua. Layer ordering is compiled by
  the browser renderer.
- Re-evaluate when live Lua calls appear, or renderer batching introduces blend
  modes or layer-state queries. Preserve ordering and compositing semantics, not
  merely function presence.

### Clear color

- Difference: `SetClearColor` is a no-op.
- Current rationale: the browser renderer owns frame clearing and current PoB
  output did not depend on changing the clear color.
- Re-evaluate when the renderer clear path becomes configurable or Lua-visible
  backgrounds depend on this call.

### Async image state

- Difference: `GetAsyncCount` always returns `0`. Browser ImageHandle exposes
  `Load` and `ImageSize`; `Unload`, `IsValid`, `IsLoading`,
  `SetLoadingPriority`, `LoadArtRectangle`, and `LoadArtArcBand` are absent.
- Current rationale: packed assets and browser image loading use a different
  asynchronous pipeline, and current startup/frame scheduling is handled by the
  browser driver.
- Re-evaluate when PoB gates frames or UI state on async counts, calls an absent
  ImageHandle method, or browser image scheduling exposes compatible lifecycle
  state.

### Art and Texture APIs

- Difference: `NewArtHandle` and ArtHandle `Size` are absent. The `Texture`
  constructor and its `Allocate`, `Load`, `Save`, `Info`, `IsValid`, and
  `StackTextures` methods are absent. `TextureInfo` fields `formatId`,
  `formatStr`, `width`, `height`, `layerCount`, and `mipCount` are absent.
- Current rationale: pob-web uses packed assets, browser decoders, and its own
  GPU texture repository. No current PoB path requiring these host APIs was
  found during the baseline audit.
- Re-evaluate when PoB Lua uses these APIs, packed asset generation moves into
  the browser, or runtime-generated/modified textures become a browser feature.
  Match observable Lua behavior without importing the desktop storage design.

### Platform-only operations

- Difference: `SetCursorPos`, `ShowCursor`, `SetWorkDir`, `ConPrintTable`,
  `ConExecute`, `ConClear`, `SpawnProcess`, `SetProfiling`, `Restart`, `Exit`,
  and `SetForeground` are no-ops. `GetScriptPath`, `GetRuntimePath`,
  `GetUserPath`, and `GetWorkDir` return browser-specific virtual paths.
- Current rationale: these operations are unsupported browser process/window
  controls, optional diagnostics, or are replaced by virtual filesystem and web
  lifecycle behavior. Some are called by Lua, so absence of a return value is
  not evidence that their side effects are irrelevant.
- Re-evaluate when Lua reaches an API through a new path, its return value, side
  effect, or timing becomes required, or browser lifecycle, filesystem,
  screenshot, cursor, or process capabilities change. Preserve the intended
  Lua-visible effect without porting Windows-specific implementation.

## Browser replacements preserving upstream behavior

### Screen and DPI scaling

- `RenderInit("DPI_AWARE")`, `GetScreenScale`, and the DPI scale override APIs
  follow the upstream logical-coordinate contract. The Canvas backing store and
  `GetScreenSize` use physical device pixels; PoB derives its virtual screen by
  dividing by the effective scale.
- System scale uses the browser `devicePixelRatio` while keeping both backing-store
  dimensions at or below 4096 pixels. A positive override replaces that effective
  scale rather than multiplying it. CSS zoom and pan do not participate in either
  value or increase the backing-store resolution.
- Browser pointer events are converted through the inverse CSS transform before
  reaching `GetCursorPos`. The resulting CSS coordinates are converted to Lua
  logical coordinates by multiplying by the effective browser scale and dividing
  by the effective DPI scale; this becomes an identity conversion at system
  default.

## Known unresolved reachability risks

These entries are not reviewed exemptions. Do not reuse them to justify a
future state advance. Resolve them, or establish and record evidence that their
Lua paths cannot be reached, before accepting a future change that touches the
corresponding browser subsystem.

### Screenshot hotkey

- Risk: `TakeScreenshot` is absent, but the browser input bridge maps the DOM
  `PrintScreen` key to PoB's `PRINTSCREEN`, and Ctrl+PrintScreen calls this API
  without an existence check.
- Required follow-up: implement a browser screenshot operation, intercept the
  unsupported action safely, or deliberately remove the reachable key contract.
  Revisit on input mapping, Canvas capture, or screenshot UI changes.
