# Contract: skills

Label: `specified` (shape), `implemented` (validation and pack in `src/skills.mjs`).

## Shape

```
skill { name, summary, procedure, guardrails, verification, instructions?, tips?,
        lifecycle, promotedBy?, deprecatedReason? }
name          kebab-case: [a-z][a-z0-9-]*  — one word or hyphenated words
summary       non-empty; what following the skill accomplishes
procedure     non-empty list of non-empty steps, in order
guardrails    non-empty list of non-empty limits the reader keeps to
verification  non-empty list of non-empty checks that show the skill worked
instructions  optional non-empty text; prose around the procedure, never a substitute for it
tips          optional list of non-empty strings; small, load-bearing reminders
lifecycle     draft (the default), promoted, or deprecated
promotedBy    required on a promoted skill; who approved it
deprecatedReason  required on a deprecated skill; why it was retired
```

## Skill rules

1. **A skill is instructions, packaged.** It adds text to context when loaded. That is the whole mechanism, and it is the only thing the mechanism does.
2. **Skills grow context, never authority.** A skill's text can tell a reader how to work; it cannot admit an effect, unlock a domain, extend a scope, or override a gate. Instructions that claim such power are a defect in the skill, because no text loaded into context has it.
3. **Summaries are searchable promises.** A skill's summary says what working this way accomplishes, in words someone scanning a pack could match to their need. A summary that could apply to any skill describes no skill.
4. **Names are kebab-case, unique within a pack.** Names name the working method, not an author, not a product, not a persona.

   `implemented` for vendors and products in `src/skills.mjs`: a name any of whose hyphen-separated words is in `VENDOR_NAMES` (`openai`, `anthropic`, `claude`, `chatgpt`, `gemini`, `grok`, `copilot`, `cursor`) is refused. The list is the vendor half of the forbidden segments in seed's tool-id grammar. Whole words are matched, not substrings. Protocol words such as `http` stay allowed, because a skill about a protocol names a method. Authors and personas are not checked by code; they remain a review rule.
5. **Tips are for edge cases, not for content that belongs in instructions.** A tip is a parenthetical the reader may skip without misunderstanding the method.

## Lifecycle

`implemented` in `src/skills.mjs`. `LIFECYCLE_STATES` is `draft`, `promoted`,
`deprecated`. `transitionSkill(record, to, { approver?, reason? })` returns a new frozen
record and leaves the given one unchanged:

| From | To | Needs |
| --- | --- | --- |
| `draft` | `promoted` | `approver`, kept as `promotedBy` |
| `draft` | `deprecated` | `reason`, kept as `deprecatedReason` |
| `promoted` | `deprecated` | `reason`; `promotedBy` is kept |
| `deprecated` | none | deprecated is terminal |

Every other move, including a move to the same state and a move back to `draft`, is
refused. A record built directly as `promoted` or `deprecated` must carry the same
field the transition would have added. A lifecycle state is a review label. It grants
nothing (rule 2).

## The pack

```
skillPack(skills) → { skill(name), names(), has(name), size }
```

- **Every entry is checked.** The pack runs each entry through `skill`. A frozen object is not trusted because it is frozen.
- **Unique names.** Two skills with the same name is a pack error.
- **Frozen.** Skills and packs freeze on build.
- **A pack is a collection.** Discovery, storage, and loading are service concerns, `specified` nowhere here beyond the shapes.

## What a skill never is

- Not code. A skill executes nothing; a reader reads it.
- Not a hook. A skill's instructions have no event and no check function; what fires deterministically is a hook's job.
- Not a tool. A skill has no effect class, makes no calls, and is never dispatched.

## Changes

- `0.4.0` — breaking. A skill requires `procedure`, `guardrails`, and `verification`
  lists in addition to `summary`; `instructions` becomes optional prose. Skills carry a
  `lifecycle`, and `transitionSkill` moves them draft → promoted → deprecated, with
  deprecated terminal. A skill built with only `summary` and `instructions` is refused
  now; give it the three lists. Released as a minor bump because drosera is pre-1.0.

- `0.3.0` — skill names refuse vendor and product words (rule 4). A skill whose name carried one was accepted before and is refused now; rename it after the method it packages.
- `0.2.0` — `skillPack` checks every entry with the skill rules. Before `0.2.0` a frozen object with a string name entered the pack unchecked, so a skill with no instructions could be packed. The change refuses entries that never met this contract; every valid entry packs as before.
