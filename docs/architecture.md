# Drosera architecture

One plant, four kinds of tentacle.

```
             the agent runs in the harness (seed, bloom)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   tool pack             skill pack             hook pack
   faces { id,       skills { name,        hooks { id, event,
   effect, connector, summary,             summary, check }
   summary }          instructions }            │
        │                     │                     │
        └──────────► cookbook recipes ◄─────────────┘
                    { id, objective, steps[] }
                    every step resolves against its pack
```

## The tool face

A face is the definition of a callable thing: `{ id, effect, connector, summary }`.

- The `id` follows seed's neutral grammar: two to four dot-separated segments, domain first, verb last, lowercase letters, digits, and hyphens — and never a vendor, protocol, environment, or character name. The grammar is seed's contract; this repository mirrors it so packs validate offline, and the mirror fixes itself when seed's contract changes.
- The `effect` is one of `read`, `write`, `destructive`, `credential`. Effect classes gate runs: read-effect tools run inside admitted scopes by default; every non-read class is admitted per objective and intent; credential effects and third-party egress route the owner's decision. Drosera carries the class on the face; seed's run model owns what the class does.
- The `connector` names the binding that performs the tool at runtime. The binding carries vendor identity and transport — none of which appears in the ID and none of which this repository stores.
- The `summary` is a contract of intent. One or two sentences a user could read and later match to what the tool actually did.

A face is a definition, not an admission. The registry entry a run admits — with `realm`, `thirdPartyEgress`, `ownerGate`, `inputSchema` — is seed's runtime record, built from the face when a run admits the tool.

## The skill

A skill is packaged instructions: `{ name, summary, procedure, guardrails, verification, triggers, inputs, outputs, examples, sources, instructions?, tips?, lifecycle }`. The name is kebab-case; the summary says what following the skill accomplishes; the eight lists are text for whoever reads context. The lifecycle runs intake, draft, review, promoted, and deprecated; a draft reaches promoted only through review, and deprecated is terminal. A skill pack collects them, unique by name.

The rule with teeth: skills grow context, never authority. Loading a skill puts text into a reader's context. A skill's instructions have no power to admit effects or extend scopes — a run that wants an effect gets it admitted through the harness like any other effect.

## The hook

A hook is a deterministic check bound to a run event: `{ id, event, summary, check }`. The events are the four points a run model can always provide:

| Event | Fires |
| :--- | :--- |
| `run-start` | a run begins, before any work |
| `before-tool` | before a tool call is dispatched |
| `after-tool` | after a tool call returns |
| `run-end` | a run completes |
| `skill-promoted` | a caller dispatches the notice of a review → promoted move |
| `skill-deprecated` | a caller dispatches the notice of a move to deprecated |

The two lifecycle events carry the frozen notice `lifecycleNotice` returns. `transitionSkill` never fires them; the caller that moved the skill does.

The `check` must be a function. This is the shape rule that keeps hooks what they are: deterministic code, not prose, not prompts, and never a model call. A forgotten invariant in a hook is code the author forgot to write, not a thought the hook had.

Fail closed is the dispatch rule: when a check throws, the throw is recorded as a failed check and the failure stands. A hook pack never converts an error into a pass, and never skips a check because it errored.

## The cookbook

A recipe is a named, repeatable composition: `{ id, objective, steps[] }`. Each step is either a tool step — `{ tool, note? }` — or a skill step — `{ skill }`. A recipe says what to call and in what order, with notes where order matters more than usual.

The composition rule: references resolve at validation. `checkRecipe` walks the steps against a tool pack and a skill pack; a step naming an unknown face or an unpackaged skill is an error, now, at check time. Cookbooks are therefore reviews, not scripts: they carry no authority, run no code, and their steps execute only under the same runs and gates any other tool call would.

## What this edition is

`src/` implements the four packs as pure data structures: validation, freezing, deduplication, lookup, event dispatch for hooks, and reference resolution for recipes. Every pack checks every entry it is given with its record rules; a frozen object is not trusted because it is frozen. No I/O, no storage, no network. A live registry behind these formats is `specified` in the contracts; the service that would host it is deliberately out of scope here.
