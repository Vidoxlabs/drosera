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
- One grammar across the family. Tool IDs follow seed's neutral grammar. This repository mirrors it locally; when the mirror and seed's contract disagree, seed wins and this repository fixes its mirror in the same commit.

## Public safety

This is a public repository. No hostnames, addresses, ports, cluster names, container names, credentials, or personal names in any file. Vendor and protocol names never appear in tool IDs; they belong in connector bindings, which this repository does not carry. A leak is a defect; finding one means fixing it before anything else ships.

## Verification

- `npm test` must stay green. A claim of `implemented` requires a passing test named for it.
- Docs change with code or they do not change at all. There is no "docs later."
- Every validation rule must be visible in a test. If it cannot be tested, it is a wish, and it must be labeled `planned`, not `implemented`.
