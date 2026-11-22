# drosera

The tooling fabric: tool faces, skills, hooks, and cookbooks. What an agent grips the world with.

Drosera is the tooling member of the public bloom agent family — the public successor to the internal skills/agents/tools registry. It defines the four packaging forms an agent works with beyond its own context. Tool faces are neutral definitions of what can be called, following seed's tool-id grammar. Skills are packaged instructions that grow context without granting authority. Hooks are deterministic checks, fail closed, bound to run events. Cookbooks are recipes that compose published faces and skills, resolved at validation.

## The name

Drosera is the sundew. A sundew works by extension: sticky tentacles that reach out from the plant and hold what they touch, each one honest about what it has caught. That is the entire doctrine of this fabric — tools reach, each face says what it grips (summary, effect class), and the plant stays a plant: the extensions never become the organism. The harness is the organism; drosera is what it holds.

## Status

Version 0.1.0. Contracts and modules only; nothing shipped runtime-wise. The pack formats, validation rules, and reference-resolution check are `implemented` as a tested reference library. A live registry, connector bindings, and any server shape are `specified` or `planned`, not built.

## Install

```bash
npm install @vidoxlabs/drosera
```

Requires Node >= 22.13. Zero runtime dependencies.

## Modules

| Module | What it holds | Label |
| :--- | :--- | :--- |
| `pack.mjs` | Tool faces under seed's neutral tool-id grammar, and the tool pack that collects them with unique IDs and domain listings. | `implemented` |
| `skills.mjs` | Skill records: named instructions with summaries, and the skill pack. | `implemented` |
| `hooks.mjs` | Hook records: deterministic checks bound to run events, and the fail-closed hook pack. | `implemented` |
| `cookbook.mjs` | Recipes composing faces and skills, with validation that every reference resolves. | `implemented` |

## The family

Drosera is one of six named projects that share one design law — ordinary botanical words for public products, mirroring five flower-named personas ([the law](https://github.com/Vidoxlabs/capillary/blob/main/docs/family.md)):

| Name | Province |
| :--- | :--- |
| [`seed`](https://github.com/Vidoxlabs/seed) | The agent harness foundation: runs, tools, providers. |
| [`capillary`](https://github.com/Vidoxlabs/capillary) | Context retrieval and relations, provenance-first. |
| [`myosotis`](https://github.com/Vidoxlabs/myosotis) | Governed memory: consent to keep, promise to forget. |
| [`aestivation`](https://github.com/Vidoxlabs/aestivation) | Plan proposal, deterministic validation, review verdicts, and the assembly gate. |
| `drosera` (this repo) | The tooling fabric: faces, skills, hooks, cookbooks. |
| [`bloom`](https://github.com/Vidoxlabs/bloom) | The agent harness the family serves: the team workspace where agents run. |

## Documentation

- `docs/charter.md` — mission, principles, non-goals.
- `docs/architecture.md` — the tentacles and how they compose.
- `docs/contracts/` — the tool, skill, hook, and cookbook contracts.
- `docs/interop.md` — how each sibling meets this fabric.

## Development

```bash
npm test
```

Tests use the Node built-in runner. Adding a rule means adding the test that holds it.

## License

MIT
