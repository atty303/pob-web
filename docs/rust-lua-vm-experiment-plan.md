# Rust Lua VM experiment plan

## Status

Proposed experiment. This document does not adopt a Rust runtime or authorize
new dependencies. Approve each new tool and library before adding it to the
repository.

## Objective

Determine whether a WebAssembly-native Lua 5.2-compatible runtime written in
Rust can materially reduce Firefox frame time during passive-tree dragging
without modifying upstream Path of Building Lua sources.

The experiment is successful only if it demonstrates all of the following:

- At least a 25% reduction in Firefox Lua/Wasm drag time. The initial reference
  is approximately 34.5 ms, so the continuation threshold is 26 ms and the
  stretch target is 21 ms.
- No more than a 5% Chromium regression in either Lua/Wasm or total frame time.
- No interaction stall attributable to runtime compilation under the fixed
  tiering scenario defined below.
- The upstream Lua sources remain unmodified.

Startup time, peak memory, and download size are recorded from the beginning.
Their product limits are set only after the performance hypothesis survives the
vertical spike.

## Current evidence

The existing drag measurement attributes approximately 12.5 ms per frame to
Lua/Wasm in Chromium and 34.5 ms in Firefox. Opcode profiling during 220 drag
frames found that `GETTABLE`, `CALL`, and `MOVE` dominate execution. The largest
adjacent pairs include `GETTABLE` to `GETTABLE` and `GETTABLE` to `CALL`.

Previous isolated changes to hash lookup, opcode dispatch, SIMD, and negative
lookup did not produce a useful improvement. The experiment must therefore
test a different value, table, call, and compilation model rather than another
local modification to the PUC Lua interpreter.

## Constraints

- Do not modify sources or packed assets under `vendor/`.
- Keep Firefox as the primary optimization target. Run Chromium at each gate as
  a regression check after the Firefox result is known.
- Keep the current Emscripten runtime as the reference implementation during
  the experiment, but do not create a permanent user-facing dual-runtime mode.
- Use `mise` as the reproducible entry point for every committed build, test,
  benchmark, and tool installation.
- Do not add Rust tools or crates without prior approval.
- Do not retain speculative compatibility layers or an unsuccessful runtime in
  production code.

## Proposed architecture

```text
Driver worker
|
+-- TypeScript browser adapter
|   +-- filesystem, RPC, input, and rendering
|   +-- WebAssembly.compile()
|   `-- compiled-module installation
|
+-- Rust Lua runtime module
|   +-- Lua 5.2 parser and bytecode compiler
|   +-- register interpreter
|   +-- values, tables, closures, and GC
|   +-- profiler
|   +-- specializing Wasm compiler
|   `-- generic runtime helpers
|
+-- shared WebAssembly.Memory
|
`-- generated Wasm modules
    +-- imported shared memory
    +-- imported generic helpers
    `-- compiled Lua functions
```

The Rust runtime generates Wasm binaries, but JavaScript remains the browser
control plane for validation, compilation, instantiation, and dispatch-table
installation. Generated modules import the runtime's memory and stable helper
ABI. Compilation runs asynchronously while the interpreter continues to
execute.

Place an experimental crate near the driver, for example under
`packages/driver/runtime-rs/`. Keep it outside the Deno workspace model and build
it through dedicated `mise` tasks. Do not replace the current runtime until all
compatibility and performance gates pass.

## Phase 0: Freeze the baseline

Restore the passive-tree drag benchmark to the active development line and
make its inputs deterministic.

Collect:

- frame, renderer, and Lua/Wasm p50, p90, and p95 times;
- startup duration, Wasm size, and peak linear memory;
- GC count and pause duration;
- opcode counts;
- inclusive and exclusive time by Lua function and call site;
- `GETTABLE` key kind, receiver kind, metatable use, and shape stability;
- `CALL` Lua/native classification, callee stability, arity, and result count.

Use PoE 1 v2.66.2, 20 warm-up frames, 200 measured frames, and ten fresh browser
processes per runtime and browser. Alternate legacy and experimental runs on the
same machine. The reference is the legacy release build from the same source
revision and asset set. Do not compare a historical result with a new build.

The primary result for each runtime is the arithmetic mean of the ten
per-process medians, calculated from unrounded values. Report a paired bootstrap
95% confidence interval for the relative change. A speedup gate passes only
when the lower confidence bound meets its threshold. A regression gate passes
only when the upper confidence bound is within its limit. Record per-process
p90, p95, p99, and maximum values as tail diagnostics; they do not replace the
primary metric.

Emit raw samples and summaries as machine-readable JSON and use one shared
summary implementation for the legacy and experimental runtimes. Record the
browser build, runtime build identifiers, asset digest, machine identifier, and
run order in each result.

## Phase 1: Characterize specialization opportunities

Identify the top drag functions and inspect every material `GETTABLE` and
`CALL` site. Determine:

- whether receivers retain a stable shape;
- the ratio of integer, interned-string, and generic keys;
- the distribution between array, hash, and metamethod lookup;
- whether `__index` resolves through a function or table;
- whether callees, argument counts, and result counts remain stable;
- whether closures, upvalues, coroutines, or yields cross the hot sites;
- how much frame time belongs to GC, rendering helpers, and host calls.

Stop if specializeable sites account for less than 25% of Lua/Wasm time, most
sites are megamorphic, or host and renderer work dominate the observed cost.

## Phase 2: Build a Rust VM microkernel

Implement only the bytecode operations required to replay the measured hot
workload. Start with `MOVE`, constants, table reads and writes, calls, returns,
comparisons, branches, and the observed arithmetic operations. Do not implement
a Lua parser or standard library yet.

Measure these value representations rather than selecting one by assumption:

1. A 16-byte tagged value.
2. A 64-bit NaN-boxed value using Wasm32 references.
3. Registers that separate numeric and reference representations.

The first table model should contain:

- a separate integer-indexed array part;
- a generic hash part;
- interned string identifiers;
- a shape identifier and structure version;
- a metatable version;
- bounded monomorphic and polymorphic inline-cache entries.

Replay the distributions recorded in Phase 1. Synthetic uniform table access
is not a sufficient benchmark.

### Gate 1

Continue only if:

- the lower confidence bound for Rust interpreter improvement over the current
  vendor runtime is at least 20% in Firefox;
- the lower confidence bound for shape-specialized lookup improvement over
  generic lookup is at least 50%, corresponding to at least twice the
  throughput;
- the lower confidence bound for stable-callee call improvement is at least
  20%;
- the projected drag improvement is at least 25%; and
- in the same replay harness, the upper confidence bound for Chromium
  microkernel throughput regression is no more than 5%.

Calculate projected drag improvement with Amdahl's law from Phase 1's measured
site coverage and the replayed speedup. Do not extrapolate from an unweighted
microbenchmark. The microkernel cannot produce a complete application frame, so
total-frame Chromium regression becomes mandatory at Gate 4 rather than Gate 1.

## Phase 3: Implement and audit the Lua frontend

Implement a Lua 5.2 source frontend and register bytecode. Required syntax and
semantics include `_ENV`, lexical upvalues, varargs, multiple returns, tail
calls, labels and `goto`, numeric and generic loops, table constructors, method
syntax, and Lua 5.2 escapes.

Compile every packed upstream Lua source and produce an incompatibility report.
An unobserved feature is not automatically safe to omit: justify omissions
through whole-corpus analysis and end-to-end coverage.

The compatibility oracle is the current repository-built Emscripten runtime,
not an unmodified stock Lua distribution. Before implementing compatibility,
inventory and characterize:

- repository changes to the vendored Lua 5.2.4 implementation;
- standard libraries opened by the driver;
- `lua-utf8` behavior;
- native globals, closures, userdata, and registry state installed by the C
  bridge;
- `boot.lua` compatibility definitions; and
- filesystem, error, and traceback behavior observable by packed sources.

Run both runtimes against the same packed source corpus, initial filesystem,
input transcript, and deterministic host responses. Normalize only explicitly
nondeterministic fields such as timestamps and generated request identifiers.
Compare returned value graphs, errors, host calls, and serialized runtime state.

### Gate 2

Continue only when all target sources compile deterministically, the bytecode
verifier accepts every function, no unsupported reachable construct remains,
and the compatibility inventory has an executable differential test or an
explicitly deferred product-integration owner for every entry.

## Phase 4: Implement runtime semantics and GC

Begin with stop-the-world mark-and-sweep. Reserve the object metadata required
for a future write barrier, but do not implement a generational collector until
measurement attributes material frame time to GC.

Required heap objects include strings, tables, prototypes, Lua and native
closures, open and closed upvalues, threads, userdata, weak tables, and error
metadata.

Prioritize differential compatibility for:

- `__index`, `__newindex`, `__call`, arithmetic, comparison, and length
  metamethods;
- protected calls, errors, and tracebacks;
- coroutines and yields;
- weak keys and values, and finalization;
- `debug.getupvalue` and `debug.setupvalue`;
- string patterns and number/string coercion;
- tail calls and multiple return values.

Run the same Lua fragments in the current repository-built vendor runtime and
the Rust VM and compare returned value graphs, errors, and observable output.
Compare finite numbers by their IEEE 754 bits and canonicalize NaN values for
comparison. Use property-based tests for table, metamethod, bytecode-verifier,
and GC invariants.

## Phase 5: Complete a browser vertical slice

Express browser services as typed Rust host operations instead of recreating
the Lua C API internally. The first slice needs only enough functionality to:

1. Read packed Lua sources and assets.
2. Execute `boot.lua` and start PoE 1.
3. Open the passive tree.
4. Deliver mouse-down, move, and mouse-up events.
5. Send draw commands to the existing renderer.
6. Record 200 drag frames.

Do not initially port network access, clipboard operations, subprocesses, cloud
storage, PoE 2, or Last Epoch. Avoid recreating WasmFS; import the narrow path
operations the runtime needs. Reuse the existing bounded Atomics RPC protocol
where a synchronous Lua-facing operation must cross an asynchronous browser
boundary.

### Gate 3

Continue only if PoE 1 starts, the passive tree produces equivalent view state
and draw commands, drag input behaves correctly, and the run has no panic,
unbounded memory growth, or semantic mismatch on the exercised path.
Equivalence means identical normalized host-call transcripts and serialized Lua
state, bitwise-equal finite numeric results, and identical draw command streams
after normalizing documented nondeterministic identifiers. Also run Canvas
visual verification against the same event transcript. Any additional numeric
tolerance must be justified and fixed before examining the experimental result.

## Phase 6: Add a baseline Wasm compiler

Start with function-level load-time compilation, not adaptive JIT compilation.
Compile primitive arithmetic, control flow, register moves, constants,
shape-guarded table access, and stable Lua-to-Lua calls. Lower all generic
operations to Rust runtime helpers.

Do not initially implement on-stack replacement, speculative cross-function
inlining, trace compilation, arbitrary-point deoptimization, generational GC,
or a persistent code cache.

Guard failure should transfer to a side-effect-safe generic block or restart a
function only when doing so cannot duplicate an effect. The compiler must reject
functions for which it cannot construct a correct fallback.

### Gate 4

Continue only if compiled hot functions beat the interpreter, Firefox drag
Lua/Wasm time improves by at least 25% excluding compilation time, generic
fallback preserves behavior, and invalid or rejected generated modules fail
back to the interpreter safely. Apply the Phase 0 confidence-interval rule to
the 25% improvement, and require the Chromium upper regression bound to remain
within 5% for both Lua/Wasm and total frame time.

## Phase 7: Add asynchronous tiering

After load-time compilation demonstrates useful speedup:

1. Increment function and call-site counters in the interpreter.
2. Emit compilation requests at VM safepoints.
3. Batch multiple functions into a generated module.
4. Generate and compile the module without stopping interpretation.
5. Instantiate it with shared memory and runtime helpers.
6. Replace dispatch entries at a safepoint.

Measure queue time, binary generation, browser compilation, instantiation,
module count, generated size, tier-up threshold, cost-recovery time, and frame
outliers. Prefer batches because one module per function amplifies compilation
and cross-instance call overhead.

The fixed tiering scenario starts from a cold runtime, opens the passive tree,
and executes the same 2,000-event drag transcript, advancing by one event after
each completed frame. Record startup, wall-clock completion, frame samples, and
all compile-request, compile-start, install, and first-execution timestamps.
Run ten fresh processes for each of three arms: the legacy interpreter, the
profile-guided load-time compiler, and adaptive tiering. A
compilation-attributable stall is either a frame overlapping those events that
exceeds the paired load-time p99 by more than 10%, or any compilation task that
blocks the runtime worker for at least 50 ms.

Treat generation, compilation, and installation CPU and wall times as separate
diagnostics rather than adding background wall time to foreground execution
time. Define adaptive cost recovery as the first frame at which its cumulative
end-to-end wall time from cold start becomes lower than the load-time arm for
the same transcript prefix.

### Gate 5

Adaptive tiering passes only if its p95 and p99 upper regression bounds are
within 10% of the paired load-time values, it causes no
compilation-attributable stall, it reaches cost recovery within the fixed
transcript, and the lower confidence bound for its end-to-end wall-time
improvement over load-time compilation is at least 5%. Otherwise retain
profile-guided load-time compilation and stop the adaptive JIT work. Keep the
legacy arm to quantify the overall product improvement, not as a substitute for
the direct adaptive-versus-load-time decision.

## Optimization order

If profiling continues to match the current evidence, optimize in this order:

1. String interning.
2. Table shapes and structural versioning.
3. Monomorphic `GETTABLE` caches.
4. Bounded polymorphic `GETTABLE` caches.
5. Stable-callee direct calls.
6. Specialized argument and return conventions.
7. Closure and upvalue specialization.
8. Small-function inlining.
9. Numeric specialization.
10. GC changes supported by pause-time evidence.

Limit a polymorphic cache to two to four shapes. Mark wider sites megamorphic
and route them permanently through a generic helper. SIMD, draw-loop reuse, and
opcode fusion are outside the initial experiment because they do not address
the measured table and call costs.

## Product integration

Expand compatibility only after the performance gates pass, in this order:

1. PoE 1 primary interactions.
2. Build import and export.
3. Filesystem persistence.
4. Network operations.
5. Subscripts.
6. PoE 2.
7. Last Epoch.
8. Error reporting and Wasm debug information.

At each stage run focused static and differential tests before driver E2E and
visual verification. Before completion run `mise run check`,
`mise run test:e2e:driver`, `mise run benchmark:driver`, Canvas visual
verification, and `mise run check:full`. Perform the Chromium benchmark last.

Remove the legacy runtime only in a separate logical change after all supported
games, critical operations, error reporting, and release checks pass. Do not
ship an indefinite fallback architecture.

## Candidate dependencies

Dependencies require approval before addition. Likely candidates are:

- a repository-pinned Rust toolchain;
- `wasm-encoder` for generated binary emission;
- `wasmparser` for validation and diagnostics;
- a property-based testing crate;
- `wasm-bindgen` only if raw imports and exports do not provide a smaller and
  clearer boundary.

Do not embed LLVM, Cranelift, or Binaryen in the browser runtime during the
initial experiment. A small compiler close to Wasm can emit the required binary
directly with less download, memory, and compilation overhead.

## Stop conditions

Stop and remove the experimental product integration if any of these holds:

- Specializeable table and call sites cover less than 25% of Lua/Wasm time.
- The microkernel cannot demonstrate sufficient Firefox improvement.
- Compatibility work expands toward a general-purpose Lua implementation
  without matching performance evidence.
- The browser vertical slice improves Firefox drag time by less than 25%.
- Cross-module helper calls consume the expected gain.
- Background compilation causes interaction stalls.
- Chromium regresses by more than 5% and avoiding it requires a permanent
  browser-specific runtime.
- Correctness requires modifying upstream sources.

## Deliverables

If the experiment succeeds, retain:

- the Rust VM and compiler;
- reproducible `mise` build and verification tasks;
- differential compatibility tests;
- Firefox and Chromium drag benchmarks;
- generated-Wasm validation and diagnostics;
- a stable runtime ABI document; and
- a new ADR that records the measured adoption decision.

If the experiment fails, retain only reproducible benchmark evidence and an ADR
that records why the runtime was rejected. Delete disconnected prototype code
instead of leaving it as a dormant alternative implementation.
