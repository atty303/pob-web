# ADR 0001: Use Atomics RPC without native Wasm SJLJ

- Status: Accepted
- Date: 2026-08-09

## Context

Path of Building exposes synchronous POSIX and Lua APIs while browser storage,
network, clipboard, and subscript operations are asynchronous. Emscripten
Asyncify previously bridged that mismatch by transforming the Wasm module,
including hot Lua interpreter paths. A Firefox performance investigation showed
that the Asyncify/JavaScript-SJLJ combination had a measurable cost, although it
did not explain most of the Firefox/Chromium frame-time gap.

The supported browser set cannot rely on JSPI. The application can instead keep
the Wasm runtime in a worker and synchronously wait for asynchronous work handled
by a broker, because deployed pages are cross-origin isolated and can use
`SharedArrayBuffer` and `Atomics.wait`.

After removing Asyncify, native Wasm setjmp/longjmp was also evaluated by
compiling and linking with `-fwasm-exceptions` and
`-sSUPPORT_LONGJMP=wasm`. This changes exception handling throughout the Lua
runtime. Mimalloc was evaluated separately as an allocator-only change.

## Benchmark evidence

The alternatives were measured on Emscripten 6.0.6 with the repository-pinned
headless Playwright browsers and PoE 1 v2.66.2. Each value is the mean of five
per-process medians; each process used 20 warm-up and 200 measured frames after
startup. Lower frame times are better. Percentages are relative to the selected
JavaScript SJLJ and mimalloc configuration. Displayed times are rounded to two
decimal places; percentages are calculated from the unrounded means.

| Configuration | Chromium frame | Chromium Lua/Wasm | Firefox frame | Firefox Lua/Wasm | Wasm size |
| --- | ---: | ---: | ---: | ---: | ---: |
| JavaScript SJLJ + mimalloc | 16.94 ms | 11.70 ms | 40.69 ms | 34.43 ms | 725,360 B |
| Native Wasm SJLJ + mimalloc | 16.53 ms (-2.4%) | 11.40 ms (-2.5%) | 40.69 ms (0.0%) | 34.42 ms (0.0%) | 725,922 B (+0.1%) |
| JavaScript SJLJ + default allocator | 16.95 ms (+0.0%) | 11.85 ms (+1.3%) | 41.86 ms (+2.9%) | 35.57 ms (+3.3%) | 667,932 B (-7.9%) |

Native Wasm SJLJ did not improve Firefox and provided only a small Chromium
improvement, so it does not justify changing exception semantics and maintaining
additional compile and link settings. Mimalloc improves Firefox frame time by
2.9% and its Lua/Wasm portion by 3.3%; that steady-state benefit is accepted in
exchange for the 8.6% larger Wasm binary and one link setting.

## Decision

- Use a synchronous, bounded RPC protocol between each Wasm worker and an
  asynchronous broker. The Wasm worker waits with `Atomics.wait`; the broker
  publishes a terminal result and wakes it with `Atomics.notify`.
- Require cross-origin isolation and fail startup when the required Atomics
  primitives are unavailable. Do not retain an Asyncify fallback.
- Keep Emscripten's default JavaScript SJLJ implementation. Do not enable native
  Wasm setjmp/longjmp or `-fwasm-exceptions` without new benchmark evidence that
  justifies reconsidering this decision.
- Keep JSPI as a possible future alternative only after the supported browser
  matrix permits it as the sole async runtime.
- Use mimalloc for the Emscripten release and debug builds.

## Consequences

The Wasm-facing APIs remain synchronous without Asyncify's whole-module
transformation. Browser-side asynchronous work and failure serialization are
centralized in the broker protocol, while the Wasm runtime must remain off the
main thread. Deployments must preserve COOP/COEP headers and compatible asset
responses.

The runtime retains JavaScript SJLJ and its associated overhead. Native Wasm
SJLJ and JSPI are not compatibility paths; either requires a new decision based
on supported browsers, runtime correctness, binary size, and repeatable
Chromium/Firefox frame benchmarks.
