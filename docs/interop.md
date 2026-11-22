# Drosera interop

How drosera meets the family. Every behavior attributed to a sibling below is sourced from that sibling's published repository at the time of writing; where a sibling has not shipped the behavior, it is not claimed.

## seed: grammar and the face/entry line

Seed owns the neutral tool-id grammar and the registry entry. Drosera's faces follow both, with one deliberate division:

- **A face is a definition** — id, effect, connector, summary — packaged here, validated against seed's grammar rules as mirrored with citation.
- **A registry entry is an admission** — with `realm`, `thirdPartyEgress`, `ownerGate`, `inputSchema` — built by the harness at run time from a face when a run admits a tool. Drosera never writes entries and never grants gates.

Seed's reading classes carry through unchanged: read-effect tools run inside admitted scopes by default; non-read classes are admitted per objective and intent; credential effects and third-party egress route the owner's decision. A pack that marks a `credential` face `read` to dodge a gate is not a drosera defect, it is a lie in a face, and the face rules reject the lie at human review — the class belongs on the face exactly because the run model trusts it.

## bloom: the observed faces and the hook archetype

Bloom describes its memory operation with owner-saved notes and a structural forget — the shapes the memory fabric's contracts carry. Those are tool faces in form: called by name, honest summaries, effects with classes. The memory domain's faces — create, list, read, delete a note — are the first worked example this format family has, and they are documented in [myosotis's interop](https://github.com/Vidoxlabs/myosotis/blob/main/docs/interop.md) under seed's registry grammar.

Bloom's deterministic plan rule — a rule that validates a response and stage order without model agency — is the archetype of a hook in this fabric: code that checks, fail closed, and never calls a model. Where bloom runs the rule inside its harness, drosera packages the shape of such rules: function, event, guarantee.

## myosotis: the destructive delete

The memory fabric's interop names the memory-domain faces on seed's registry: `memory.note.create`, `memory.note.list`, `memory.note.read`, and `memory.note.delete` — "deliberately the forget face, and deliberately classified destructive." Drosera agrees with that convention and records it: the `delete` verb pairs with the `destructive` effect, and a destructive face routes the owner's decision at run time. A pack carrying memory faces marks the delete face destructive; anything less would make the forget promise cosmetic, and the family does not do cosmetic.

## capillary: retrieval faces under read

Retrieval is capillary's province: bounded packets with provenance, never storage. Faces that retrieve — search a source, read a packet, list relations — are `read`-effect faces in a drosera pack, named in capillary's domains. The boundary holds in this fabric's terms: a face that retrieves returns what was asked for with its provenance intact; the moment that output is kept, the keep is the memory fabric's business, not a face's.

## aestivation: checks, then verdicts

The admission loop validates plans deterministically (its rule pack) and records judgment on an append-only ledger (its verdicts). The split maps to this fabric exactly: a rule like "review precedes assemble" could run as a hook — deterministic code, fail closed — while an approve or revise verdict never could. Aestivation's loop is a consumer of the same distinction drosera packages: code checks things; reviewers, which are agents or people, judge them; and neither borrows the other's job.

## Family

The family law lives in the [capillary repository's family doc](https://github.com/Vidoxlabs/capillary/blob/main/docs/family.md), whose fourth law leaves the line open: a new product earns its name through the same law. Drosera is that sixth member: the sundew, the extensions the agent works with. Short form: seed for the harness foundation, capillary for retrieval, myosotis for memory, aestivation for admission and review, drosera for tooling, bloom for the workspace. Ordinary botanical words; provinces stay distinct.
