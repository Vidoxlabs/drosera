# Contract: hooks

Label: `specified` (rules), `implemented` (records, pack, and dispatch in `src/hooks.mjs`).

## Shape

```
hook { id, event, summary, check }
id      kebab-case string, unique within a pack
event   one of: run-start | before-tool | after-tool | run-end
summary non-empty; what the check guarantees
check   a function: (payload) → { ok, message? } — deterministic code, never prose
```

## The event set

The four events are the minimal neutral points a run model can always provide:

| Event | Fires | Payload carries |
| :--- | :--- | :--- |
| `run-start` | a run begins | the objective |
| `before-tool` | before a tool call dispatches | the face ID and arguments |
| `after-tool` | after a tool call returns | the face ID and result |
| `run-end` | a run completes | the outcomes |

A harness with richer event points may extend the set in its own registers; this contract holds the four every run model can honor.

## Hook rules

1. **The check is a function.** A hook record without a function is not a hook. This is the shape rule that keeps hooks deterministic by construction: checks are code the author wrote, not prose a model might interpret, and never a model call.
2. **Fail closed.** A check that throws is a failed check, recorded with its error, and the failure stands. Dispatch never converts an error into a pass and never skips a hook because it threw.
3. **Hooks never widen scope.** A hook observes a payload and returns a verdict on it. A hook cannot admit effects, grant gates, modify memory, or release the run to do things it was not already admitted to do. A check that "fails" a run toward a stop is enforcing; no check can fail toward permission.
4. **Determinism is the contract.** Same payload, same result, every time. A check that reads a clock, a random source, or a network is not deterministic and does not belong in a hook.
5. **Summaries state the guarantee.** "Tool arguments are well-formed before dispatch" is a summary; "makes things better" is not.

## The pack

```
hookPack(hooks)            → { hook(id), hooksFor(event), ids(), size }
runHooks(pack, event, payload) → results[]  — { id, passed, detail } in pack order
```

- **Unique IDs.** A duplicate hook ID is a pack error.
- **Pack order dispatch.** Hooks run in pack order for the event; results are reported in the same order, each marked `passed: true|false`.
- **Frozen records.** A hook freezes on creation; its behavior is its check's code, referenced, not copied.

## What a hook never is

- Not a specialist. A check that needs judgment belongs to the harness's reviewers; a hook that wants a model is mislabeled and rejected at the boundary of this contract's doctrine even though its shape may validate.
- Not a verdict. Review verdicts are the admission loop's records. A hook passes or fails a check; it never records an approve and never requests revisions.
