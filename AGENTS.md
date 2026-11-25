<!-- Managed file. Propose changes by pull request; they are carried into the shared templates. hash: ea95635b111eee41 -->

# Drosera workspace

## What this is

Drosera is the tooling fabric in the public bloom agent family. It holds the contracts and modules for what an agent works with beyond its own context: tool faces (the neutral definitions of what can be called), skills (packaged instructions that grow context), hooks (deterministic checks around run events), and cookbooks (recipes that compose published faces and skills).

This repository holds contracts first, and second a small, dependency-free reference module implementing the pack formats and validation rules. Nothing here is a server, a deployed skill registry, or a connector runtime.

## Claim labels

Every capability in this repository carries exactly one label, and it must be true on its face:

- `implemented` - exists as tested code in `src/` with `npm test` coverage.
- `specified` - exists as a written contract a competent party could implement against.
- `planned` - named as an intent. Never presented as done.
- `observed` - recorded as observed behavior of another system, with its source named.

A label is a claim about this repository in its current state. When a label stops being true, the label changes or the claim is removed.

## Progress honesty

The reference modules are honest library implementations of validation, pack, and composition rules, exercised by unit tests in this repository. They are not a live tool registry. Nothing in this repository is deployed online. Do not write docs, READMEs, or comments that imply it is.

## Tooling honesty rules

These rules bind contributions to this repository and the code it accepts:

- Every face carries its effect class and a summary a user could match to the tool's observed behavior. A face whose summary promises something its connector does not do is a defect in the face.
- Skills grow context, never authority. Loading a skill admits no effects, unlocks no domains, and grants no scope beyond what the run already has.
- Hooks are deterministic code, fail closed. A hook record without a check function is not a hook. A hook that needs a model is not a hook; it is a specialist's job. A check that throws is a failed check, never a skipped one.
- Cookbooks resolve their references at validation. A recipe pointing at a face nobody ships or a skill nobody packaged is a defect at check time, not a surprise at runtime.
- One grammar across the family. Tool IDs follow seed's neutral grammar. This repository mirrors it locally. When the mirror and seed disagree, seed wins. Refresh the mirror in a drosera change, with the test that shows the disagreement is gone. A task that started in seed does not edit this repository. Until the mirror is refreshed, the disagreement is debt. Trellis may report it. That report is not permission for the seed task to grow into this checkout.

## Public safety

This is a public repository. No hostnames, addresses, ports, cluster names, container names, credentials, or personal names in any file. Vendor and protocol names never appear in tool IDs; they belong in connector bindings, which this repository does not carry. A leak is a defect; finding one means fixing it before anything else ships.

## Verification

- `npm test` must stay green. A claim of `implemented` requires a passing test named for it.
- Docs change with code or they do not change at all. There is no "docs later."
- Update `docs/capabilities/index.json`, the owning capability spec, and `docs/CHANGELOG.md` in the same PR as any code or contract change.
- Every validation rule must be visible in a test. If it cannot be tested, it is a wish, and it must be labeled `planned`, not `implemented`.

## Stay in this province

This repository packages external tool faces, skills, hooks, and cookbooks. It is a peer, not seed's harness tooling. Seed is the floor and owns the grammar. Capillary, myosotis, and aestivation are the other peers. Bloom is the only composer. Trellis is outside the call path. This task does not edit them. A skill grants no authority. A hook is deterministic and fails closed. A cookbook resolves its references when it is checked. When this grammar and seed's grammar disagree, seed wins. The mirror is refreshed in a later drosera task, not in seed's commit.

Do not add a connector, a registry server, or a live tool.

## Where the other seven live

| The work | Repository |
| --- | --- |
| Run records, tool identity, provider shape | `seed` |
| Bounded retrieval and relations | `capillary` |
| Consent, forget, and recall | `myosotis` |
| Plans, verdicts, and the assembly gate | `aestivation` |
| Tool faces, skills, hooks, cookbooks | `drosera` (here) |
| Probes over those libraries | `trellis` |
| The team workspace a person opens | `bloom` |
| Family documentation, synced from every public repository | `docs` |

## Skills

The skill contract is `docs/contracts/skills.md`, the checker is `src/skills.mjs`, and the document reader is `src/skill-markdown.mjs`. The reader takes text, never a path. A skill in this repository is a record that contract accepts. It still grants no tool and no gate. Do not describe a skill as an agent that may act.

## Agents

One working method lives here. Do not add a roster of agents. A specialist that uses a face is bloom's concern. The face's definition can live here. The run that calls it cannot.

## References

Read in this order: this file, `docs/charter.md`, `docs/architecture.md`, `docs/contracts/`, `docs/interop.md`, `docs/capabilities/`, then `src/`. Code and `npm test` win over a stale sentence.

## Cookbook

The cookbook contract is `docs/contracts/cookbook.md`. `checkRecipe` is the checker. A recipe in documentation is not cooked by this repository.

1. Read this file and the charter.
2. Run `npm test`.
3. Change a validation rule only together with the test that holds it.
4. Stop at the province boundary in the table above.

## Research corpora

Before planning a change to a module that serves a capability, call `research_plan` with
this repository's name. One call returns every capability's claims, the axis with the test
that holds each decision, and the gaps already open. This repository is covered by the
`drosera` notebook.

- `research_plan <repo>` is the planning call; `research_for <capability>` (for example
  `CAP-04.3`) narrows to one, `research_axis <id>` gives the full decision with its
  options and the test that fails if it is reversed, `research_card <id>` the verbatim
  quote, and `research_challenge <term>` the evidence against behaviour already shipped.
- `research_queue` lists the gaps already recorded. Check it first so you do not re-raise
  one, and so you can see which capabilities are already blocked.
- A capability the plan calls `untouched` has neither a claim nor a gap. Call
  `research_raise` with the capability, the slice and the acceptance test it blocks, then
  stop that slice and report it. Do not plan it on general knowledge.

The tools are read-only apart from `research_raise`, and every call is recorded, so an
unconsulted plan is visible. Funding, syncing, labelling and source deletion belong to
extraction and are not exposed to you: never cite a source a card did not return, and
never edit `intel/research/`. The full rule is the research corpora rule in the workspace
`AGENTS.md`, one directory up.

## MCP

This repository is not an MCP server. Do not commit an MCP configuration, a server address, or a credential. An MCP tool, if one is ever packaged, is a face plus a connector. The connector is not in this repository. Vendor names stay out of the tool identifier.
