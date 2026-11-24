# Contract: cookbooks

Label: `specified` (shape), `implemented` (records and checks in `src/cookbook.mjs`).

## Shape

```
recipe { id, objective, steps[] }
step    { tool, note? }  — a tool step: call the face with this ID
        | { skill }      — a skill step: load this skill before continuing
id          kebab-case, unique within a cookbook
objective   non-empty; what cooking this recipe accomplishes
```

## Recipe rules

1. **A recipe is a named, repeatable composition.** Steps are what to call and in what order, or what to load before continuing. A recipe with one step is legitimate; the name is not size.
2. **Steps are one kind each.** A step is a tool step or a skill step, never both, never neither.
3. **References resolve at validation.** `checkRecipe` walks every step against the tool pack and the skill pack it names: a tool step must name a face in the pack, a skill step must name a packaged skill. A dangling reference is an error at check time. This is the rule that keeps cookbooks honest: what they compose must exist before they run, not be discovered missing at runtime.
4. **Notes carry load-bearing order.** A note on a step says why this order, or what to watch — a note is not where the recipe hides its objective.
5. **Recipes carry no authority.** A recipe's steps execute only under the same runs and gates any other tool call would. Cooking a recipe admits nothing; the run checks each effect as it always would.

## The cookbook

```
cookbook(recipes)      → { recipe(id), ids(), size }
checkRecipe(recipe, toolPack, skillPack) → { ok, errors[] }
```

- **Every entry is checked.** The cookbook runs each entry through `recipe`. A frozen object is not trusted because it is frozen.
- **Unique IDs.** Two recipes with the same ID is a cookbook error.
- **Check is data.** `checkRecipe` returns errors openly, in step order; it never repairs, drops, or reorders steps to make a recipe pass.
- **Frozen.** Recipes freeze on creation.

## What a cookbook never is

- Not a script. A recipe describes; it executes nothing. The run that follows a recipe is a run, with every gate a run has.
- Not a plan. Plans, validation rule packs, and verdicts are the admission loop's records; a recipe is documentation of repeatable work, composable with faces and skills but never gating assembly.
- Not a substitute for testing the steps. Each face keeps its own summary, effect class, and behavior; a recipe's sequence being valid says nothing about whether any individual call succeeded — that is each call's business.

## Workspace coding recipe

`workspaceCodingRecipe` uses recipe ID `workspace-coding` and resolves all
its tool references through `workspaceToolPack`. It describes inspection, an
appropriate approved write or update, verification, and a finish face. The
recipe declares tool references. Bloom decides whether it can execute each call.

## Changes

- `2.4.0` adds the `workspace-coding` recipe for the workspace and finish pack (CAP-04, drosera#4).

- `0.2.0` — `cookbook` checks every entry with the recipe rules. Before `0.2.0` any frozen object entered the cookbook unchecked, so a recipe with no steps, or a step of both kinds, could be held. The change refuses entries that never met this contract; every valid entry packs as before.
