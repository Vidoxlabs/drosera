# CAP-19: Skill safety scan

- ID: `CAP-19`
- Title: Skill safety scan
- Lead: `drosera`
- Touches: `trellis`
- Horizon: `later`
- Milestone: `M9`
- CLI phase: `none`
- Status: `proposed`
- Claim: `planned`
- Depends on: `none`

## Why

Skills are packaged instructions injected into an agent's context. Although `drosera`'s contract establishes that skills grow context and never grant authority, a skill document can still contain text urging an agent to read outside its workspace, inspect credentials, skip verification tests, or claim ungranted authority. Catching those hazards deterministically before promotion prevents unsafe skills from reaching `promoted` or entering a public skill catalog, while preserving pure deterministic checks with no model dependency.

## What it does

1. **Deterministic skill safety scanner (`CAP-19.1` in `drosera`)**: Inspects a validated skill record and/or raw skill document text already held in memory (reads no file path, makes no network calls, invokes no model, and reads no clock). Evaluates deterministic pattern and structural rules across four hazard classes:
   - **Outside-workspace reach**: Instructions directing the reader to read, write, traverse, or exfiltrate data outside admitted workspace roots.
   - **Credential reading**: Instructions directing the reader to locate, read, print, or transmit credentials, auth tokens, or secret stores.
   - **Skipping tests or verification**: Instructions telling the reader to bypass test suites, ignore failed checks, suppress errors, or mark work done without running verification.
   - **Claiming authority**: Instructions claiming that loading the skill admits tool effects, unlocks domains, widens scopes, overrides owner gates, or ratifies owner decisions.
2. **Severity classification**: Every match produces a frozen finding `{ id, rule, severity, summary, location }` sorted deterministically:
   - `critical`: Blocks promotion (`ok: false`). The skill cannot enter `promoted` until the offending instruction is removed.
   - `warning`: Does not hard-block on its own, but is returned explicitly in the scan report and hook detail for the reviewer to inspect during `review` before promotion.
3. **`skill-promoted` hook integration (`CAP-19.1` in `drosera`)**: Exposes a deterministic hook check bound to the `skill-promoted` event. When dispatched with a promotion notice and the skill record or document text under promotion, it runs the safety scan and fails closed (`passed: false`) on any `critical` finding or if the skill content required for scanning is missing or unreadable. Warnings are included in the hook result detail for reviewer visibility.
4. **Behavior probes (`CAP-19.2` in `trellis`)**: Adds injected-subject behavior probes in `trellis` verifying clean skills, `critical` rejection across all four hazard classes, `warning` propagation, deterministic output ordering, and fail-closed rejection on missing or malformed payloads.

## Contract touchpoints

- `drosera` (`docs/contracts/skills.md`): Documents the safety scan rules alongside Skill Rule 2 ("Skills grow context, never authority") and the `review` -> `promoted` promotion boundary while keeping `skill()` and pure `transitionSkill()` callers compatible.
- `drosera` (`docs/contracts/hooks.md`): Documents the `skill-promoted` safety scan hook expectations, including payload requirements and fail-closed enforcement on `critical` findings or absent skill content.
- `trellis` (`docs/contracts/probes.md`): Adds behavior probes exercising the injected skill safety scanner without importing `drosera` in `trellis` core.

## Tool IDs and events

### Tool IDs

None. This capability defines a deterministic safety scanner and hook check and introduces no tool IDs.

| Tool ID | Effect | Summary |
| --- | --- | --- |

### Events

| Event | Kind | Fires | Payload carries |
| --- | --- | --- | --- |
| `skill-promoted` | drosera hook event | when a caller dispatches a `review` to `promoted` notice for safety verification | `{ name, from, to, approver }` along with the skill record or document text required by the deterministic scan hook |

## Acceptance tests

- `scan-blocks-outside-workspace-instructions`: a skill instructing the reader to access or exfiltrate outside workspace roots yields a `critical` finding and fails promotion (`ok: false`).
- `scan-blocks-credential-read-instructions`: a skill instructing the reader to read or transmit credentials or auth tokens yields a `critical` finding and fails promotion.
- `scan-blocks-skip-tests-instructions`: a skill instructing the reader to skip `npm test` or ignore failed checks yields a `critical` finding and fails promotion.
- `scan-blocks-authority-claim-instructions`: a skill claiming to grant tool effects, widen scopes, or bypass owner gates yields a `critical` finding and fails promotion.
- `scan-returns-warnings-for-reviewer`: warning-level findings appear in the deterministic scan result and hook detail without silently disappearing, allowing the reviewer to inspect them.
- `skill-promoted-hook-fails-closed-without-skill-payload`: dispatching the `skill-promoted` safety hook without the skill record/text or with invalid input returns `passed: false` rather than waving the promotion through.
- `scan-is-deterministic-and-pure`: identical skill inputs produce identical ordered findings with zero file I/O, network access, or model calls.
- `trellis-skill-scan-probes-verify-all-classes`: `trellis` probes over injected `drosera` scanner exports confirm clean pass, all four critical hazard classes, warning reporting, and fail-closed behavior (`CAP-19.2`).

## Slices

- `CAP-19.1` (`drosera`, `M9`, `proposed`): Deterministic skill safety scanner and `skill-promoted` hook integration (`docs/contracts/skills.md`, `docs/contracts/hooks.md`, `src/`, `test/`).
- `CAP-19.2` (`trellis`, `M9`, `proposed`): Skill safety scan behavior probes over injected `drosera` exports (`docs/contracts/probes.md`, `src/` / `test/`).

## Non-goals

- Using an LLM or semantic classifier inside the scanner; `drosera` hooks and checks remain strictly deterministic code.
- Opening file paths or walking directories from inside `drosera`; callers pass in-memory skill records or text strings, consistent with `skillFromMarkdown`.
- Silently rewriting or stripping unsafe lines from a skill to make promotion pass; rejected skills require explicit author revision.
- Replacing human review of skill accuracy, utility, and honesty during the `review` stage.

## Family rules and conflicts

- **Skills grow context, never authority (`drosera/docs/contracts/skills.md`)**: Any instruction claiming authority is both a skill contract violation and a `critical` safety scan failure.
- **Deterministic fail-closed hooks (`drosera/docs/contracts/hooks.md`)**: The `skill-promoted` hook never calls a model, never touches disk/network, and treats throws or missing scan payloads as `passed: false`.
- **No direct sibling imports in `trellis` core (`trellis/AGENTS.md`)**: `CAP-19.2` probes take the scanner as an injected subject so `trellis` tests stay green without sibling checkouts.
- **Zero runtime dependencies**: Both `drosera` and `trellis` implement all checks with Node built-ins only.

## Open owner decisions

- **Notice payload shape vs pre-transition scan helper (pending owner decision)**: Currently `lifecycleNotice(before, after)` returns `{ name, from, to, approver }` without the skill record or document text, and `transitionSkill` stays pure without dispatching hooks. Whether callers pass `{ notice, skill, markdown? }` to the `skill-promoted` safety hook or also run `scanSkill()` as a prerequisite before `transitionSkill(..., 'promoted')` (plus exact boundary between `critical` and `warning` rules) will be settled before `CAP-19.1` implementation (see `D13` and `D14` in `docs/timeline/decisions.md` for timeline and slice milestone conventions).

## Evidence

- Current state: `planned`. `drosera/src/hooks.mjs` already defines `skill-promoted` in `EVENTS`, and `drosera/src/skills.mjs` and `src/skill-markdown.mjs` implement `skill()`, `skillFromMarkdown()`, `transitionSkill()`, and `lifecycleNotice()`. No safety scanner exists yet.
- Test paths, PR numbers, and commit SHAs will be recorded here when slices `CAP-19.1` and `CAP-19.2` land.

## Changes

- `2026-11-23`: Initial specification created in `docs-timeline-scaffold` (`proposed`, `planned`).
- `2026-11-23`: Added `M9` slice milestones and clarified open owner decision status (`CAP-01`, review fixes).
