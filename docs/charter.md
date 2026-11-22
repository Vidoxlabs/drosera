# Drosera charter

## Mission

Build the packaging for what an agent works with beyond its own context. Drosera holds the contracts for tool faces, skills, hooks, and cookbooks: the four forms that turn a model in a harness into an agent that can call things, know things about calling things, check things deterministically, and repeat what worked.

The name is the doctrine. The sundew does its work by extension: tentacles reach from the plant, each one grips, and what is held is held visibly. Tools are those tentacles — and the doctrine has teeth in both directions. Each face says what it grips, and the plant never mistakes its tentacles for itself: the harness runs the agent; drosera is what the agent holds. A tool pack of ten thousand faces does not make a framework; it makes a sundew.

## Principles

1. **Faces are honest by construction.** A tool face carries a neutral ID from seed's grammar, an effect class from the closed set, the connector binding's name, and a summary a user could read and match to the tool's observed behavior. Effect classes go on the face, not vibes: read stays read, destructive says so, and the harness gates what its classes gate.
2. **Skills grow context, never authority.** A skill is packaged instructions. Loading one puts text into context. It does not admit effects, unlock domains, or extend a run's scopes. Instructions that claim authority they were not given are a defect in the skill.
3. **Hooks are deterministic code, fail closed.** A hook is a function bound to a run event. It never calls a model, never writes memory, never grants scope. A check that throws is a failed check, and a failed check stops things, never waves them through.
4. **Cookbooks resolve at validation.** A recipe names the faces and skills it composes, and those references must resolve against real packs at check time. A dangling reference is a defect now, not a surprise at runtime.
5. **One grammar across the family.** Tool IDs follow seed's neutral tool-id grammar. This repository mirrors it locally with citation, and when the mirror disagrees with seed's contract, seed wins.

## Non-goals

- **Not a harness.** Runs, providers, and admission live in seed; the family's workspace where agents run is bloom. Drosera is the parts in the agent's hands.
- **Not a connector runtime.** Faces name the connector binding that performs them; the binding itself — vendor identity, transport, credentials — is the harness's job at runtime, never this repository's files.
- **Not a model caller.** Nothing in drosera invokes a model. A hook that needs judgment is mislabeled; its job belongs to a specialist in the harness, and a skill's instructions are text a reader reads, not code a fabric executes.
- **Not a skill host.** Drosera defines the pack format and validation. Where skills are stored, discovered, and loaded at runtime is a service concern, `specified` here and built elsewhere.
