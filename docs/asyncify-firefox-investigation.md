# Asyncify and Firefox performance investigation

## Summary

The current Asyncify/JavaScript-SJLJ runtime has a measurable performance cost,
but changing that runtime does not explain most of the Firefox/Chromium
performance gap in the Path of Building frame loop. The experiment could not
separate Asyncify's cost from the exception implementation's cost.

On Path of Exile 1 v2.67.2, replacing Asyncify with a working JSPI build reduced
the median Firefox Lua/Wasm portion of a frame from 49 ms to 36 ms. The remaining
Firefox/Chromium gap was still 28.36 ms, so only 23.85% of that gap was closed.
The renderer took approximately 4-5 ms in both browsers and did not explain the
difference.

Replacing the current Asyncify/JavaScript-SJLJ runtime is a demonstrated size and
performance improvement, but Asyncify removal by itself still requires an
independent measurement. Do not treat it as the primary fix for Firefox
performance. Profile Firefox's execution of the Lua VM, indirect calls, and
exception handling before attributing the remaining gap.

## Question and decision rule

The investigation tested whether Asyncify is the primary reason that PoB's Wasm
frame loop is slower in Firefox.

The decision rule was:

- Primary cause: removing Asyncify closes at least 50% of the Firefox/Chromium
  gap.
- Contributor: Firefox improves by at least 10%, but less than 50% of the gap is
  closed.
- Not demonstrated: the confidence interval includes no improvement, or the
  renderer accounts for the difference.

The result classifies the current Asyncify/JavaScript-SJLJ combination as a
contributor. Asyncify's independent contribution remains unmeasured.

## Existing Asyncify surface

The release driver is built with `-sASYNCIFY`, a 128 KiB Asyncify stack, WasmFS,
and `-sMAIN_MODULE`. Asynchronous C/JavaScript boundaries include:

- WasmFS operations backed by ZenFS in
  `packages/driver/src/c/wasmfs/nodefs_js.cpp`;
- clipboard paste in `packages/driver/src/c/driver.c`;
- subscript launch and cancellation in `packages/driver/src/c/sub.c`;
- HTTP requests in `packages/driver/src/c/lcurl.c`.

An `ASYNCIFY_ADVISE=1` build reported 5,824 propagation messages. Instrumented
paths included `luaV_execute`, `luaD_call`, `luaD_precall`, `lua_pcallk`, frame
handling, and key handling. Asyncify therefore transforms code used by the hot
Lua frame loop even when no operation suspends during that frame.

## Method

The benchmark ran the ordinary rendered PoE 1 v2.67.2 UI in fresh browser
processes. Each result consists of five repetitions, with 20 warm-up frames and
200 measured frames per repetition. Measurement began only after startup had
completed, at least ten seconds had elapsed, and console activity had been quiet
for five seconds.

Each frame was split into:

- `frame`: total time spent by `onFrame`;
- `renderer`: the renderer's reported frame time;
- `Lua/Wasm`: `frame - renderer`.

The test environment was:

- Emscripten 4.0.11;
- Chrome for Testing 152.0.7977.8;
- Firefox 153.0;
- release optimization (`-O3` and LTO);
- headless Playwright browsers;
- Path of Exile 1 v2.67.2.

The comparison used static `lua-utf8` linkage on both sides to remove the
`MAIN_MODULE`/side-module difference. The Asyncify build used Emscripten's
default JavaScript SJLJ implementation. The JSPI build used Wasm exceptions, as
described under [Comparison limitation](#comparison-limitation).

## Results

The values below are the mean of the five per-run medians, in milliseconds.
Confidence intervals were computed by bootstrapping whole runs rather than the
correlated frames within each run.

| Browser | Metric | Asyncify | JSPI | Improvement | 95% CI |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | frame | 15.80 | 11.66 | 26.20% | 24.87-27.42% |
| Chromium | renderer | 3.98 | 3.94 | 1.01% | -0.51-2.50% |
| Chromium | Lua/Wasm | 11.76 | 7.64 | 35.03% | 33.22-36.61% |
| Firefox | frame | 53.80 | 40.80 | 24.16% | 23.51-24.91% |
| Firefox | renderer | 5.00 | 5.00 | 0.00% | 0.00-0.00% |
| Firefox | Lua/Wasm | 49.00 | 36.00 | 26.53% | 25.31-27.76% |

| Metric | Asyncify Firefox-Chromium gap | JSPI Firefox-Chromium gap | Gap closed |
| --- | ---: | ---: | ---: |
| frame | 38.00 ms | 29.14 ms | 23.32% |
| Lua/Wasm | 37.24 ms | 28.36 ms | 23.85% |

The current production-shaped Asyncify build independently reproduced the
symptom: its median Lua/Wasm time was 13.4 ms in Chromium and 51 ms in Firefox.
This establishes that the gap is present in the normal build, while the static
comparison estimates how much can be removed by changing the async runtime.

Release Wasm size also fell from 3,708,324 bytes for the production Asyncify
build to 2,766,405 bytes for the diagnostic JSPI build. The size comparison is
directional because the JSPI build also statically linked `lua-utf8` and changed
exception handling.

## Comparison limitation

This is not a strict one-variable experiment. Two Emscripten constraints prevent
such a build for the current Lua runtime:

1. With Emscripten's default JavaScript SJLJ, Lua's `setjmp`/`longjmp` path adds
   an `invoke_vii` JavaScript frame. JSPI cannot suspend across that frame and
   aborts with `SuspendError: trying to suspend JS frames`.
2. Compiling Lua with `-fwasm-exceptions` removes that JavaScript frame and makes
   JSPI work, but Emscripten 4.0.11 cannot transform the resulting exception
   constructs with Asyncify. The Asyncify pass aborts during linking.

The measured change therefore combines the async runtime and the exception
implementation. The result is strong evidence that removing the current
Asyncify/SJLJ combination helps, but it must not be presented as a precise
estimate of Asyncify alone.

ZenFS synchronous mode was deliberately excluded. It had previously failed the
application's usability requirements and is not a candidate for another
migration.

## Follow-up investigation

Before an async-runtime migration is justified primarily by Firefox speed:

1. Profile a steady-state frame in Firefox and Chromium with function-level Wasm
   symbols enabled.
2. Compare time in `luaV_execute`, Lua call/return machinery, indirect calls, and
   exception/SJLJ helpers.
3. Add a compute-only Lua benchmark that performs no filesystem, clipboard,
   network, or subscript operation.
4. Repeat on production-supported browser versions and a non-headless browser.
5. Preserve separate renderer and Lua/Wasm measurements.

See [Async runtime migration guide](async-runtime-migration.md) for an
implementation design that does not depend on JSPI support.
