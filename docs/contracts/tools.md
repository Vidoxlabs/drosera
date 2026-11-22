# Contract: tool faces

Label: `specified` (shape), `implemented` (validation and pack in `src/pack.mjs`).

The tool-id grammar is seed's contract
([tool-id.md](https://github.com/Vidoxlabs/seed/blob/main/docs/contracts/tool-id.md));
this document specifies the face and the pack on top of it. When this mirror and
seed's contract disagree, seed wins.

## Shape

```
face { id, effect, connector, summary }
id         seed's neutral tool-id grammar: domain . [resource . [sub .]] verb
effect     one of: read | write | destructive | credential
connector  non-empty string naming the binding that performs the tool
summary    non-empty contract of intent, readable by a user
```

## Face rules

1. **The ID parses under seed's grammar.** Two to four segments, lowercase letters, digits, hyphens; the last segment is a verb from the closed set; no vendor, protocol, infrastructure, or persona segments. Faces inherit every prohibition of the grammar.
2. **The effect class is on the face.** One of `read`, `write`, `destructive`, `credential`. The class belongs to the definition, and the harness's run model owns what the class gates.
3. **The connector is named, not carried.** A face records which binding performs it. The binding's vendor identity, transport, and credentials never appear in the face, never appear in the ID, and are not this repository's to store.
4. **The summary is a contract of intent.** A user reads it, calls the tool, and matches what happened to what was promised. A summary that could not be falsified this way is a defective summary.

## Family conventions (observed, not invented)

These pairings are observed usage across the family, noted here so packs read consistently; they are conventions, not grammar:

- the `delete` verb pairs with the `destructive` effect (the memory fabric's note faces do this);
- retrieval faces use `read`, `list`, and `search` under the `read` effect;
- `credential` effects route the owner's decision at run time, per seed's reading classes.

## The pack

```
toolPack(faces) → { face(id), inDomain(domain), has(id), ids(), size }
```

- **Every entry is checked.** The pack runs each entry through `toolFace`, whatever it is and wherever it came from. A frozen object is not trusted because it is frozen: an invalid ID, a missing connector, or an empty summary is a pack error.
- **Unique IDs.** Two faces with the same ID is a pack error; the second one is never silently dropped.
- **Frozen.** A pack and its faces are frozen on build. Correction is a rebuild, not a mutation.
- **Domain listing.** `inDomain` returns the faces whose ID's first segment matches, in pack order. Domains partition nothing two packs share: a pack is a collection, not the universe.

## Faces vs registry entries

A face is a definition. A registry entry — seed's runtime record with `realm`, `thirdPartyEgress`, `ownerGate`, `inputSchema` — is an admission. Drosera never writes registry entries and never grants gates; the harness builds its entries from faces when a run admits a tool. Nothing in this contract may be read as runtime admission.

## Changes

- `0.2.0` — `toolPack` checks every entry with the face rules. Before `0.2.0` a frozen object with a known effect class entered the pack unchecked, so a face with a malformed ID or an empty summary could be packed. The change refuses entries that never met this contract; every valid entry packs as before.
