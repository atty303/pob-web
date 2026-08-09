# Async runtime migration guide

## Goal

Remove Emscripten Asyncify without changing upstream Path of Building Lua code or
requiring synchronous ZenFS. Preserve the synchronous POSIX/Lua-facing APIs while
asynchronous browser work is performed outside the blocked Wasm worker.

The preferred compatibility design is a synchronous RPC bridge built from a
dedicated Wasm worker, a broker, `SharedArrayBuffer`, and `Atomics.wait`. JSPI is
useful for experiments, but is not the baseline design while all supported
browsers, including Safari and Silk, cannot be assumed to support it reliably.

Read the [performance investigation](asyncify-firefox-investigation.md) before
using this migration as a Firefox performance fix. It found that the current
Asyncify/JavaScript-SJLJ combination is a contributor, not the main cause of the
browser gap; the experiment did not isolate Asyncify from exception handling.

## Architecture

```mermaid
sequenceDiagram
    participant Lua as Lua / C / Wasm
    participant W as Wasm worker
    participant B as async broker
    participant API as Browser API / ZenFS / network

    Lua->>W: synchronous imported function
    W->>B: postMessage(request, shared control/data)
    W->>W: Atomics.wait(control, PENDING)
    B->>API: await operation
    API-->>B: result or error
    B->>W: write result; Atomics.store; Atomics.notify
    W-->>Lua: synchronous return value
```

The broker may initially live on the main thread. Prefer a separate worker for
storage and network work when the main thread would otherwise perform substantial
serialization or copying. The Wasm worker must never be the broker for an
operation on which it waits: its event loop cannot resolve a Promise while it is
blocked in `Atomics.wait`.

## Deployment prerequisites

`SharedArrayBuffer` requires a cross-origin-isolated page. Production and every
local/E2E server must send:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Before implementing the bridge, audit all scripts, fonts, images, Wasm modules,
game archives, authentication flows, popups, and CDN responses under these
headers. Cross-origin assets must be CORS-enabled or carry an appropriate
Cross-Origin-Resource-Policy header. Verify `globalThis.crossOriginIsolated` and
`typeof SharedArrayBuffer === "function"` before starting the driver.

Do not silently fall back to Asyncify. If isolation or Atomics support is absent,
fail startup with a diagnostic that identifies the missing prerequisite. A
fallback would retain two runtime architectures and prevent removal of Asyncify.

## RPC protocol

Define a small, versioned protocol rather than exposing arbitrary callbacks.
Each request needs:

- an operation tag and request ID;
- a control block with `PENDING`, `SUCCESS`, and `ERROR` states;
- result length, numeric return value, and errno/error metadata;
- bounded request and response buffers;
- an explicit cancellation and shutdown policy.

Use fixed-width integer fields in the shared control block. Write response bytes
and metadata before publishing the terminal state with `Atomics.store`, then call
`Atomics.notify`. The waiting worker must re-check the state after every wake-up.
Treat unknown operation tags, oversized payloads, and malformed lengths as hard
protocol errors.

Start with one in-flight request. This matches the synchronous caller and makes
ownership unambiguous. Introduce multiple slots or a ring buffer only after a
profile demonstrates contention. Do not hold a broker-side lock while awaiting a
browser Promise.

For payloads larger than the shared buffer, use chunked reads/writes. Avoid
allocating a new `SharedArrayBuffer` for each call and avoid base64 or JSON for
file bodies. Strings and structured errors may use UTF-8 in the shared data area.

## Operations to migrate

Migrate one boundary at a time behind a typed TypeScript broker interface:

1. Read-only WasmFS operations, beginning with open/read/close and stat.
2. Remaining directory and mutation operations in
   `packages/driver/src/c/wasmfs/nodefs_js.cpp`.
3. Network requests from `packages/driver/src/c/lcurl.c`.
4. Clipboard paste from `packages/driver/src/c/driver.c`.
5. Subscript launch and cancellation from `packages/driver/src/c/sub.c`.

Filesystem operations are the vertical spike because they exercise errors,
binary payloads, and repeated calls. Use the existing asynchronous ZenFS backend
in the broker; do not reintroduce ZenFS synchronous mode.

Clipboard access can require a user gesture and main-thread browser APIs. Route
it through the main-thread broker and preserve the current error behavior.
Subscripts already involve worker coordination; document worker ownership and
ensure neither worker waits cyclically for the other.

## Build migration

Keep the first vertical spike on a dedicated build variant. Once all asynchronous
boundaries use synchronous broker imports:

1. Remove `-sASYNCIFY`, `-sASYNCIFY_STACK_SIZE`, and `-sASYNCIFY_IMPORTS`.
2. Remove `Asyncify` from `EXPORTED_RUNTIME_METHODS`.
3. Remove `EM_ASYNC_JS` from migrated imports. The JavaScript import should only
   publish the broker request, wait, decode the result, and return synchronously.
4. Remove `{ async: true }` from every Emscripten `cwrap` call, including the
   driver wrappers in `packages/driver/src/js/worker.ts` and the subscript wrapper
   in `packages/driver/src/js/sub.ts`. Update their Promise types, callers,
   `await` expressions, and error propagation to match synchronous returns.
5. Keep the Wasm runtime in a worker; `Atomics.wait` must not run on the browser
   main thread.
6. Decide exception handling separately. Do not make a JSPI-driven
   `-fwasm-exceptions` change part of the Atomics migration unless benchmarks and
   browser support justify it.
7. Keep `lua-utf8` statically linked and avoid `-sMAIN_MODULE`. This is independent
   of the Atomics protocol, but restores normal dead-code elimination and removes
   the dynamic loader from the generated JavaScript.

Search the generated JavaScript and build logs for Asyncify after removal; a
successful compile alone does not prove that no compatibility path remains.

## Failure and deadlock rules

- Every request must end in `SUCCESS` or `ERROR`; broker exceptions must be
  serialized into `ERROR` before notification.
- Add a debug-only timeout or watchdog that reports request ID, operation, and
  elapsed time. Do not use a timeout as normal recovery for filesystem writes.
- On driver shutdown, reject new requests and wake every waiter with a shutdown
  error.
- Never call back synchronously into the blocked Wasm worker from the broker.
- Never wait on the main thread.
- Do not let authentication, popup, or user-gesture flows hold an unobservable
  wait indefinitely.
- Preserve POSIX errno semantics at the C boundary; keep JavaScript exception
  strings for diagnostics rather than branching on them in C.

## Verification and rollout

For the vertical spike, verify one real flow end to end before migrating the
remaining operations:

1. Load PoE 1 from a packed archive through the broker-backed filesystem.
2. Reach a stable rendered frame and confirm item database loading.
3. Exercise a missing file and a failed read, checking the returned errno.
4. Verify clean worker shutdown while idle and while an operation is pending.
5. Run `mise run check`, `mise run test:e2e:driver`, and
   `mise run test:e2e:web` as applicable.

Before completing the migration, run `mise run check:full` and cover:

- Chromium, Firefox, Safari, and the supported Silk environment;
- local development and production headers;
- local and cloud-backed save/load, directory listing, and deletion;
- clipboard paste;
- successful, failed, cancelled, and timed-out network requests;
- subscript success, failure, cancellation, and shutdown;
- loss or restart of the broker worker;
- cross-origin assets and authentication under COOP/COEP.

Repeat the investigation's steady-state frame benchmark. Record total frame,
renderer, and Lua/Wasm time independently, along with startup time, Wasm size,
peak memory, and filesystem throughput. Compare a fixed PoB release and fixed
browser versions over multiple fresh processes.

Roll out only after telemetry can distinguish broker protocol errors, filesystem
errors, cross-origin-isolation failures, and worker termination. Because the
migration removes the old runtime rather than retaining a fallback, rollback is
a release rollback.

## JSPI alternative

JSPI can express the existing `EM_ASYNC_JS` style without transforming the whole
Wasm module and produced a substantially smaller diagnostic binary. It is a
reasonable future simplification after the supported browser matrix permits it.

For the current Lua 5.2 build, JSPI is not a link-flag-only replacement:

- exported functions that may suspend must be listed in `JSPI_EXPORTS`;
- default JavaScript SJLJ creates JavaScript frames that JSPI cannot suspend
  across;
- `-fwasm-exceptions` was required in the working diagnostic build;
- `lua-utf8` static linkage avoided `MAIN_MODULE`/side-module complications.

If JSPI is reconsidered, create a fresh browser-support decision and re-run the
full compatibility and performance matrix. Do not combine a JSPI experiment with
the production Atomics implementation unless the project intentionally chooses
JSPI as its only runtime.
