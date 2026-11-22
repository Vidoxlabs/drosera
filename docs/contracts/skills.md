# Contract: skills

Label: `specified` (shape), `implemented` (validation and pack in `src/skills.mjs`).

## Shape

```
skill { name, summary, procedure, guardrails, verification,
        triggers, inputs, outputs, examples, sources, instructions?, tips?,
        lifecycle, promotedBy?, deprecatedReason? }
name          kebab-case: [a-z][a-z0-9-]*  — one word or hyphenated words
summary       non-empty; what following the skill accomplishes
procedure     non-empty list of non-empty steps, in order
guardrails    non-empty list of non-empty limits the reader keeps to
verification  non-empty list of non-empty checks that show the skill worked
triggers      non-empty list of non-empty situations that call for the skill
inputs        non-empty list of non-empty things the reader needs before starting
outputs       non-empty list of non-empty things following the skill produces
examples      non-empty list of non-empty worked examples
sources       non-empty list of non-empty references to the evidence the skill rests on
instructions  optional non-empty text; prose around the procedure, never a substitute for it
tips          optional list of non-empty strings; small, load-bearing reminders
lifecycle     intake, draft (the default), review, promoted, or deprecated
promotedBy    required on a promoted skill; who approved it
deprecatedReason  required on a deprecated skill; why it was retired
```

`SECTION_LISTS` exports the five lists added in `1.0.0`, in the order above. Together
with `summary`, `procedure`, `guardrails`, and `verification`, they are the record form
of the nine sections the predecessor skill validator required in a skill document. This
repository checks the record. It does not parse a document. A missing list, an empty
list, or a list holding anything but non-empty text is refused, and each refusal names
its field.

## Skill rules

1. **A skill is instructions, packaged.** It adds text to context when loaded. That is the whole mechanism, and it is the only thing the mechanism does.
2. **Skills grow context, never authority.** A skill's text can tell a reader how to work; it cannot admit an effect, unlock a domain, extend a scope, or override a gate. Instructions that claim such power are a defect in the skill, because no text loaded into context has it.
3. **Summaries are searchable promises.** A skill's summary says what working this way accomplishes, in words someone scanning a pack could match to their need. A summary that could apply to any skill describes no skill.
4. **Names are kebab-case, unique within a pack.** Names name the working method, not an author, not a product, not a persona.

   `implemented` for vendors and products in `src/skills.mjs`: a name any of whose hyphen-separated words is in `VENDOR_NAMES` (`openai`, `anthropic`, `claude`, `chatgpt`, `gemini`, `grok`, `copilot`, `cursor`) is refused. The list is the vendor half of the forbidden segments in seed's tool-id grammar. Whole words are matched, not substrings. Protocol words such as `http` stay allowed, because a skill about a protocol names a method. Authors and personas are not checked by code; they remain a review rule.
5. **Tips are for edge cases, not for content that belongs in instructions.** A tip is a parenthetical the reader may skip without misunderstanding the method.

## Lifecycle

`implemented` in `src/skills.mjs`. `LIFECYCLE_STATES` is `intake`, `draft`, `review`,
`promoted`, `deprecated`: the promotion path of the predecessor skill lifecycle, in
lowercase. Only the states and their moves are ported. Drosera reads no file, keeps
no clock or timestamp, and runs no quality gate on a move.
`transitionSkill(record, to, { approver?, reason? })` returns a new frozen record and
leaves the given one unchanged:

| From | To | Needs |
| --- | --- | --- |
| `intake` | `draft` | nothing |
| `intake` | `deprecated` | `reason`, kept as `deprecatedReason` |
| `draft` | `review` | nothing |
| `draft` | `deprecated` | `reason` |
| `review` | `promoted` | `approver`, kept as `promotedBy` |
| `review` | `draft` | nothing; the record carries no promoter |
| `review` | `deprecated` | `reason` |
| `promoted` | `deprecated` | `reason`; `promotedBy` is kept |
| `deprecated` | none | deprecated is terminal |

Every other move is refused, including `draft` → `promoted`, a move to the same state,
and any move out of `promoted` except deprecation. A skill reaches `promoted` only
through `review`. An `intake`, `draft`, or `review` record carries neither `promotedBy`
nor `deprecatedReason`, so a move back to `draft` clears the promoter. A record built
directly in a state must carry the same field the transition would have added. The
record keeps no history, so a record built directly as `promoted` is checked for its
`promotedBy` and not for the path it took. A lifecycle state is a review label. It
grants nothing (rule 2).

## Lifecycle notices

`implemented` in `src/skills.mjs`. `lifecycleNotice(before, after)` checks both records
as skills and returns the notice a move leaves for the hook events `skill-promoted` and
`skill-deprecated` (see the hooks contract). It ports the predecessor's promoted and
deprecated log events as a record only.

| `before.lifecycle` | `after.lifecycle` | Notice (frozen) |
| --- | --- | --- |
| `review` | `promoted` | `{ name, from: 'review', to: 'promoted', approver }`, with `approver` from `promotedBy` |
| `intake`, `draft`, `review`, or `promoted` | `deprecated` | `{ name, from, to: 'deprecated', reason }`, with `reason` from `deprecatedReason` |

Every other pair throws `SkillError`. A move into `draft`, `intake`, or `review` is not a
notice, and neither is a pair that is not a move or a pair naming two different skills.
The function writes no file, reads no environment variable, and calls no network.
`transitionSkill` stays pure: it does not build a notice or dispatch a hook.

## The pack

```
skillPack(skills) → { skill(name), names(), has(name), size }
```

- **Every entry is checked.** The pack runs each entry through `skill`. A frozen object is not trusted because it is frozen.
- **Unique names.** Two skills with the same name is a pack error.
- **Frozen.** Skills and packs freeze on build.
- **A pack is a collection.** Discovery, storage, and loading are service concerns, `specified` nowhere here beyond the shapes.

## Public catalog

`skillCatalog(entries)` builds an in-memory snapshot from `{ skill, license }` entries.
It applies the existing skill validator to each entry and uses the skill's name as
its slug. Duplicate slugs are refused. The license is catalog metadata.

- An entry whose skill fails validation, including a missing section list, refuses the
  whole catalog. It is never listed.
- `list()` returns frozen `{ slug, license, skill }` items in input order. A skill
  is listed only if its lifecycle is `promoted` and the entry explicitly gives it
  the `MIT` license.
- `read(slug)` returns the corresponding public item. Missing and non-public slugs
  both throw `SkillError`.

Build a fresh snapshot when a skill's lifecycle or license changes.

## What a skill never is

- Not code. A skill executes nothing; a reader reads it.
- Not a hook. A skill's instructions have no event and no check function; what fires deterministically is a hook's job.
- Not a tool. A skill has no effect class, makes no calls, and is never dispatched.

## Changes

- `2.1.0` — additive `lifecycleNotice` export, the record for the new hook events
  `skill-promoted` and `skill-deprecated`. No skill, transition, pack, or catalog call
  valid under `2.0.0` changes.

- `2.0.0` — breaking. The lifecycle gains `intake` and `review`, and a draft reaches
  `promoted` only through `review`. `transitionSkill(draft, 'promoted', …)`, valid
  under `1.0.0`, is refused now; move the draft to `review` first, then promote it
  with its approver. `review` may also return to `draft`, which carries no promoter.
  `LIFECYCLE_STATES` lists five states, so a caller comparing it to the three-state
  list sees a change. The default lifecycle stays `draft`, the five section lists
  stay required, and the catalog still lists only a promoted skill whose own license
  is `MIT`.

- `1.0.0` — breaking. A skill also requires `triggers`, `inputs`, `outputs`,
  `examples`, and `sources`, each a non-empty list of non-empty text. A skill valid
  under `0.5.0` that omits any of them is refused now by `skill`, `skillPack`,
  `transitionSkill`, and `skillCatalog`. Migrate a record by giving it the five lists
  from the skill's own document. `SECTION_LISTS` is a new export. `instructions` and
  `tips` stay optional. The lifecycle, its terminal deprecated state, and the catalog
  rule (promoted, own license `MIT`) are unchanged.

- `0.5.0` — additive `skillCatalog` export for listing and reading promoted MIT skills.

- `0.4.0` — breaking. A skill requires `procedure`, `guardrails`, and `verification`
  lists in addition to `summary`; `instructions` becomes optional prose. Skills carry a
  `lifecycle`, and `transitionSkill` moves them draft → promoted → deprecated, with
  deprecated terminal. A skill built with only `summary` and `instructions` is refused
  now; give it the three lists. Released as a minor bump because drosera is pre-1.0.

- `0.3.0` — skill names refuse vendor and product words (rule 4). A skill whose name carried one was accepted before and is refused now; rename it after the method it packages.
- `0.2.0` — `skillPack` checks every entry with the skill rules. Before `0.2.0` a frozen object with a string name entered the pack unchecked, so a skill with no instructions could be packed. The change refuses entries that never met this contract; every valid entry packs as before.
