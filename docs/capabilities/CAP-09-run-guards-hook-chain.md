# CAP-09: Run guards (ordered hook chain)

- ID: `CAP-09`
- Title: Run guards (ordered hook chain)
- Lead: `drosera`
- Touches: `bloom`, `seed`
- Horizon: `next`
- Milestone: `M3`
- CLI phase: `P3`
- Status: `proposed`
- Claim: `planned`
- Depends on: `CAP-04`

## Why

Agent runs need hard, predictable limits and safety checks around model turns and tool calls without scattering ad-hoc branches through the harness or turning deterministic guards into model judgment. Drosera's hook contract already covers run boundaries (`run-start`, `run-end`) and tool boundaries (`before-tool`, `after-tool`), but lacks explicit model-turn events (`before-model`, `after-model`) needed to enforce call limits, compact context near budget, and pause cleanly on clarification requests. Defining the new hook events in `drosera` and documenting the fixed-order guard chain across `seed` and `bloom` keeps every guard deterministic, fail-closed, and auditable.

## What it does

1. **Additive hook events (`CAP-09.1` in `drosera`)**: Adds `before-model` and `after-model` to `EVENTS` in `src/hooks.mjs` (an additive minor change; existing run events and lifecycle events remain valid). All drosera hook rules remain binding: each guard `check` must be a deterministic function (never prose, never a model call, never reads clocks, randomness, or network, never widens scope), and `runHooks` dispatches in pack order and fails closed when any check throws or returns `ok !== true`.
2. **Clarification pause and guard refusal codes (`CAP-09.2` in `seed`)**: Maps guard clarification pauses to `seed`'s `waiting_for_owner` run state via the CAP-06 `question` deferred-call mechanism, and defines typed guard refusal codes on step/attempt outcomes so guard halts are distinct from handler errors or gate denials.
3. **Fixed-order guard hook chain (`CAP-09.3` in `bloom`)**: Executes bloom's run guards in deterministic pack order around model and tool steps:
   - **Call limits**: Enforces per-run ceilings on model calls, tool calls, and total tokens before dispatching the next model or tool step. Reaching any limit stops the run with a typed guard refusal and reason.
   - **Repeated-call detection**: Computes `(toolId, argsDigest) -> resultDigest` on tool calls. When the same tool ID and argument digest returns the same result digest `N` times, the guard warns the model once with a bounded notice; if repeated again, it stops the run with a stated reason.
   - **Tool-output budget**: Enforces a byte/character budget on returned tool output in `after-tool`. Oversized output is cut deterministically to a bounded preview alongside `truncatedBytes` and the cryptographic SHA-256 digest of the full output, never silently pretending the preview is complete.
   - **Context compaction near budget**: When assembled context approaches the configured budget in `before-model`, older working records are summarized into a derived summary source explicitly linked to the replaced record IDs and digests so structural forget (`CAP-11`) reaches and invalidates the compacted summary whenever any replaced record is forgotten.
   - **Clarification pause**: When a model asks the owner for clarification instead of guessing ambiguous intent, the guard transitions the run to `waiting_for_owner` using the CAP-06 `question` path until an owner decision or reply arrives, with the reply marked as owner input on resume.
4. **Typed guard decision events**: Every guard decision (pass, warn, cut, compact, pause, stop) is recorded in the run event stream (`CAP-10`) as a typed event naming the guard ID, hook event, action, and reason without recording secret payloads.

## Contract touchpoints

- `drosera` (`docs/contracts/hooks.md`): Additive minor expansion of `EVENTS` with `before-model` and `after-model`, their payload shapes, and preservation of deterministic fail-closed dispatch.
- `seed` (`docs/contracts/run-model.md`): Typed guard refusal codes and `waiting_for_owner` clarification pause alignment with CAP-06 `question`.
- `bloom` (`docs/architecture.md`): Fixed-order guard chain execution in the run loop and typed guard decision emission onto the run stream.

## Tool IDs and events

### Tool IDs

None. This capability defines hook events and run-guard behavior only and introduces no tool IDs.

| Tool ID | Effect | Summary |
| --- | --- | --- |

### Events

| Event | Kind | Fires | Payload carries |
| --- | --- | --- | --- |
| `before-model` | drosera hook event | before a model generation request dispatches | run/step identifiers, current call and token counts, context budget snapshot |
| `after-model` | drosera hook event | after a model generation response returns | normalized generation metadata, finish reason, usage totals, proposed action summary |

Note: `bloom` also records typed guard decision events (pass, warn, cut, compact, pause, stop with reason) onto the unified trace stream defined in `CAP-10`.

## Acceptance tests

- `before-model-and-after-model-accepted-by-hook-pack`: `EVENTS` in `drosera/src/hooks.mjs` contains `before-model` and `after-model`, and `hook()`, `hookPack()`, and `runHooks()` validate and dispatch them in pack order alongside existing events.
- `model-event-hook-fails-closed-on-throw`: a `before-model` or `after-model` check that throws produces `passed: false` with error detail and blocks further progression.
- `call-limit-guard-stops-run-with-reason`: exceeding configured model-call, tool-call, or token caps stops the run before dispatch and records a typed guard event with reason.
- `repeated-call-warns-once-then-stops`: repeating the same `(toolId, argsDigest)` with identical `resultDigest` `N` times issues one warning to the model and halts on repeat with a typed reason.
- `tool-output-budget-cuts-with-preview-and-digest`: tool output exceeding budget returns a bounded preview, `truncatedBytes`, and full-output SHA-256 digest while emitting a guard decision event.
- `compaction-links-derived-summary-to-replaced-records`: compacting context near budget records a derived source linked to replaced record IDs and digests so forgetting a replaced record invalidates the derived summary.
- `clarification-pause-holds-run-for-owner`: a model clarification request parks the run via CAP-06 `question` in `waiting_for_owner` and resumes only after owner input is recorded.

## Slices

- `CAP-09.1` (`drosera`, `M3`, `proposed`): Add `before-model` and `after-model` run events to hook contract and pack (`docs/contracts/hooks.md`, `src/hooks.mjs`, `test/`).
- `CAP-09.2` (`seed`, `M3`, `proposed`): Clarification pause and guard refusal codes (`docs/contracts/run-model.md`, `src/`).
- `CAP-09.3` (`bloom`, `M3`, `proposed`): Ordered guard hook chain in run loop (call limits, repeated-call detection, tool-output budget, context compaction with derived-source provenance, clarification pause, and typed decision events).

## Non-goals

- Calling a model inside any drosera hook; checks requiring semantic judgment belong to specialists or reviewers, not hooks.
- Hosting run state, timers, or compaction storage inside `drosera`; `drosera` owns only the hook shape, event set, and fail-closed pack dispatch.
- Silently truncating tool outputs without declaring `truncatedBytes` and full-output digest.
- Treating compacted summaries as unlinked facts that survive a `myosotis` forget epoch bump on their source records.

## Family rules and conflicts

- **Deterministic fail-closed hooks (`drosera`)**: A hook check is always a pure synchronous function; any throw is a failed check (`passed: false`), never skipped.
- **No scope widening (`drosera`, `seed`)**: Guards can only tighten, pause, or stop execution; no guard can admit an unpermitted tool or bypass an owner gate.
- **Structural forget preservation (`myosotis`, `CAP-11`)**: Derived compaction summaries must stay linked to replaced record IDs/digests so forget reaches them.
- **Digest-bound owner input (`seed`, `CAP-06`)**: Clarification pauses obey `waiting_for_owner` and never treat model text or recalled memory as owner replies.
- **Zero runtime dependencies**: All implementations across `drosera`, `seed`, and `bloom` use Node built-ins only.

## Open owner decisions

- **D4 (pending owner decision)**: Schema validation ownership (`CAP-03`). Whether `drosera` mirrors `seed`'s schema subset with a parity test (the same way it mirrors the tool grammar) when guard inspection or `question` / tool-output metadata uses typed schemas is governed by pending owner decision `D4`.
- **Default guard thresholds (pending owner decision)**: Exact default per-run limits (model calls, tool calls, tokens, tool-output byte cap, context compaction threshold, and repeat threshold `N`) require explicit defaults before `CAP-09.3` ships.
- **D12 / D13 / D14 relation (pending owner decision)**: Pending `bloom` P2 tool IDs (`D12`, guarded in `CAP-04` and `CAP-09`), timeline milestones (`D13`), and `M3` slice milestone conventions (`D14`) live in `docs/timeline/decisions.md`.

## Evidence

- Current state: `planned`. `drosera/src/hooks.mjs` currently exports `EVENTS` with the four run events (`run-start`, `before-tool`, `after-tool`, `run-end`) and two lifecycle events (`skill-promoted`, `skill-deprecated`). No `before-model`, `after-model`, or run-guard chain code exists yet.
- Test paths, PR numbers, and commit SHAs will be recorded here as slices `CAP-09.1` through `CAP-09.3` land.

## Changes

- `2026-11-23`: Initial specification created in `docs-timeline-scaffold` (`proposed`, `planned`).
- `2026-11-23`: Added `M3` slice milestones and aligned canonical `D4` and `D12` decision references (`CAP-01`, review fixes).
