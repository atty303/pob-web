---
name: sync-simplegraphic
description: Synchronize pob-web with PathOfBuilding-SimpleGraphic only when the user explicitly invokes $sync-simplegraphic. Review upstream Lua-facing compatibility, implement browser-runtime changes, verify them, and advance the tracked upstream state.
---

# Synchronize SimpleGraphic

Use this skill only for an explicit `$sync-simplegraphic` request. Read
`references/upstream-state.json`, the repository `AGENTS.md`,
`$investigate-problem`, and `$develop-repository` before changing files.

## Establish the comparison

1. Require a clean working copy, or isolate pre-existing user changes that do
   not overlap the synchronization. Never include unrelated changes.
2. Fetch the configured repository into a temporary clone, including branches
   and tags. Freeze the remote default branch `HEAD` and the highest stable
   semantic-version tag reachable from it as `targetHead`, `targetReleaseTag`,
   and `targetReleaseCommit`; use their full commit IDs throughout.
3. Verify that `reviewedThrough` exists upstream and is an ancestor of `HEAD`.
   Stop without changing the state if it is missing, ancestry was rewritten, or
   the release tag is not reachable from `HEAD`.
4. Stop and present recovery choices if a stored tag now resolves to a different
   commit, or the target release and `reviewedThrough` have diverged. Recommend
   a user-approved full re-audit from the last trusted ancestor rather than
   silently replacing the baseline.
5. Define the only unreviewed set as `reviewedThrough..targetHead`. If
   `targetReleaseCommit` is a descendant of `reviewedThrough`, inspect it as
   `reviewedThrough..targetReleaseCommit` and `targetReleaseCommit..targetHead`.
   Otherwise inspect an empty released range and `reviewedThrough..targetHead`
   as the post-release range. Record empty ranges in the final report.
6. If `reviewedThrough == targetHead`, exit without changing files when the
   stored release fields match. When only the target release metadata changed,
   verify its tag and commit, then continue through the required checks and
   independent review before updating and committing only those state fields.

## Audit browser compatibility

Review every commit in both ranges. Inspect Lua API registration and behavior
plus rendering, images and fonts, input, callbacks, async work, files,
compression, networking, subprocesses, and Lua/LuaJIT interactions. Compare
applicable changes with the C bridge, JavaScript driver and renderer, Lua
bootstrap, and tests in this repository.

Evaluate Windows-only code and dependency/build updates, but do not port them
when they cannot affect the browser runtime. Report why each material group was
applicable or excluded.

Classify the Lua-facing contract for every unreviewed change before
implementation. Keep released and post-release findings separate in the report:

- Compatible: additive APIs, optional arguments, corrections that preserve valid
  existing calls, performance improvements, and internal changes. Implement
  applicable browser behavior.
- Incompatible: removals or renames, new required arguments, accepted-type or
  return-shape changes, semantic changes to valid existing calls, or changes
  requiring coordinated PoB Lua migration. Stop, leave `reviewedThrough`
  unchanged, and ask the user once with the evidence, affected Lua calls, viable
  choices, and a recommendation.

Internal C++ changes alone are not Lua API incompatibility. Do not treat missing
browser-only platform capabilities as incompatibility when the existing Lua
contract can be preserved with an appropriate browser implementation.

## Implement and verify

1. Make the smallest coherent browser-runtime changes. Do not modify packed or
   upstream PoB sources. Request approval before adding any dependency.
2. Add focused regression coverage for behavior that static checks cannot
   guarantee. Preserve LuaJIT compatibility where the maintained Lua fork is
   involved.
3. Run `mise run check` and `mise run test:e2e:driver`. Run `mise run test` for
   Wasm, builds, package boundaries, CI, or release behavior. For visible
   Canvas/WebGL or input changes, also use `$canvas-visual-verification` after
   the automated driver E2E suite.
4. Complete the repository's independent review workflow against a frozen diff
   and resolve all accepted findings.
5. Only after every required check and review succeeds, update `reviewedThrough`
   to `targetHead` and the release fields to `targetReleaseTag` and
   `targetReleaseCommit`. Keep the implementation and state update in one
   logical change.

If upstream advanced but required no browser change, commit the state-only
review as `chore(driver): review SimpleGraphic through <short-sha>`. If
implementation changed, use
`fix(driver): synchronize SimpleGraphic through <short-sha>`. Follow repository
version-control and Codex co-author rules. If already synchronized, create no
change.

On any unresolved failure, do not advance the state or commit partial
synchronization. Report the compared ranges, compatibility classification,
implemented or excluded areas, verification evidence, and remaining blocker.
