# ADR 0002: Keep the render backend boundary independent of WebGL2

- Status: Accepted
- Date: 2026-08-12

## Context

The browser renderer had WebGL2 and experimental WebGPU implementations behind
the `RenderBackend` interface. The WebGPU implementation translated the WebGL2
rendering structure directly and performed substantially worse in Chrome. Its
per-dispatch bind group, render pass, and command submission overhead made it
unsuitable as a maintained alternative.

WebGL2 is currently the only production backend. Coupling the renderer and text
systems to WebGL2 APIs would make a future backend require another cross-cutting
refactor. WebGPU remains a likely future candidate when it can be designed around
its own command submission and resource reuse model.

## Decision

- Remove the current WebGPU backend and all runtime selection, fallback,
  settings, diagnostics, dependencies, and tests dedicated to it.
- Keep `RenderBackend` as the API-neutral boundary used by the renderer and glyph
  atlas. Do not add WebGL2 context, shader, texture, extension, or resource types
  to this interface.
- Use WebGL2 as the sole backend without retaining compatibility flags or dormant
  WebGPU code.
- Treat WebGPU as a candidate for a future backend implemented against the same
  boundary. Reintroducing it requires a design that batches command encoding and
  submission and reuses GPU resources rather than mirroring WebGL2 calls.

## Consequences

The active rendering path and its public setup API are simpler, while backend
selection is no longer user-configurable. Stored settings containing the former
WebGPU field are harmlessly ignored and are rewritten without it when settings
are next saved.

The backend interface remains an intentional abstraction despite having one
implementation. Changes to shared renderer code must continue to express
rendering operations without depending on WebGL2-specific APIs.
