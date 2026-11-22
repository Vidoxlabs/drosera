// Drosera reference library tests. Every rule that matters is visible here.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EFFECT_CLASSES,
  parseToolId,
  toolFace,
  toolPack,
  FaceError,
  skill,
  skillPack,
  SkillError,
  EVENTS,
  hook,
  hookPack,
  runHooks,
  HookError,
  recipe,
  cookbook,
  checkRecipe,
  RecipeError,
} from '../src/index.mjs';

test('the effect classes are exactly seed\'s four', () => {
  assert.deepEqual([...EFFECT_CLASSES].sort(), ['credential', 'destructive', 'read', 'write']);
});

test('a well-formed ID parses into its parts', () => {
  const parts = parseToolId('memory.note.create');
  assert.deepEqual(parts, { domain: 'memory', resource: 'note', sub: null, verb: 'create' });
  const four = parseToolId('docs.file.metadata.read');
  assert.deepEqual(four, { domain: 'docs', resource: 'file', sub: 'metadata', verb: 'read' });
});

test('grammar edges reject exactly as seed\'s contract says', () => {
  assert.throws(() => parseToolId('Memory.note.read'), Error); // uppercase
  assert.throws(() => parseToolId('memory.note'), Error); // no verb
  assert.throws(() => parseToolId('memory.note.create.extra.toomuch'), Error); // five segments
  assert.throws(() => parseToolId('v1.node.read'), Error); // infrastructure-like segment
  assert.throws(() => parseToolId('memory.openai.read'), Error); // vendor name segment
  assert.throws(() => parseToolId('memory.note.insert'), Error); // verb not in the closed set
  assert.throws(() => parseToolId('.memory.read'), Error); // leading separator
});

test('a valid face freezes its contract of intent', () => {
  const face = toolFace({
    id: 'memory.note.create',
    effect: 'write',
    connector: 'memory-binding',
    summary: 'Add a durable, scoped note to the memory store.',
  });
  assert.equal(face.id, 'memory.note.create');
  assert.equal(face.effect, 'write');
  assert.throws(() => { face.effect = 'read'; }, TypeError);
});

test('a face without effect, connector, or summary is rejected with every issue', () => {
  assert.throws(
    () => toolFace({ id: 'memory.note.read', effect: 'scan', connector: '', summary: '' }),
    (error) => error instanceof FaceError && error.issues.length === 3
  );
});

test('a pack holds one face per ID and refuses duplicates', () => {
  const a = toolFace({ id: 'docs.row.list', effect: 'read', connector: 'docs-binding', summary: 'List rows.' });
  const b = toolFace({ id: 'docs.row.read', effect: 'read', connector: 'docs-binding', summary: 'Read one row.' });
  const pack = toolPack([a, b]);
  assert.equal(pack.size, 2);
  assert.deepEqual(pack.inDomain('docs').map((f) => f.id), ['docs.row.list', 'docs.row.read']);
  assert.equal(pack.inDomain('memory').length, 0);
  assert.throws(() => toolPack([a, a]), /duplicate tool ID/);
});

test('a skill packages instructions and freezes', () => {
  const packaged = skill({
    name: 'pre-flight-review',
    summary: 'Walk the checklist before any destructive call.',
    instructions: 'Read the effect class on the face. Confirm the scope. Then call.', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'],
    tips: ['Slow is smooth.'],
  });
  assert.equal(packaged.name, 'pre-flight-review');
  assert.throws(() => { packaged.name = 'renamed'; }, TypeError);
});

test('skill names are kebab-case and other shapes reject', () => {
  assert.throws(() => skill({ name: 'PreFlight', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }), SkillError);
  assert.throws(() => skill({ name: 'preflight', summary: '', instructions: '', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }), SkillError);
  assert.throws(() => skill({ name: 'preflight', summary: 's', instructions: '', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'], tips: '' }), SkillError);
  assert.throws(() => skill({ name: 'preflight', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'], tips: [''] }), SkillError);
});

test('a skill pack dedupes by name', () => {
  const a = skill({ name: 'same', summary: 'first', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] });
  const b = skill({ name: 'same', summary: 'second', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] });
  assert.throws(() => skillPack([a, b]), /duplicate skill name/);
});

test('the hook events are exactly the four run points', () => {
  assert.deepEqual([...EVENTS].sort(), ['after-tool', 'before-tool', 'run-end', 'run-start']);
});

test('a hook check is a function by construction: prose is rejected', () => {
  const good = hook({
    id: 'args-well-formed',
    event: 'before-tool',
    summary: 'Tool arguments are well-formed before dispatch.',
    check: (payload) => (payload.args ? { ok: true, message: 'ok' } : { ok: false, message: 'missing args' }),
  });
  assert.equal(good.event, 'before-tool');
  assert.equal(typeof good.check, 'function');
  assert.throws(
    () => hook({ id: 'x', event: 'before-tool', summary: 's', check: 'check the args carefully' }),
    /check must be a function/
  );
});

test('a hook with an unknown event or empty summary is rejected', () => {
  assert.throws(() => hook({ id: 'x', event: 'mid-tool', summary: 's', check: () => {} }), /event must be one of/);
  assert.throws(() => hook({ id: 'x', event: 'run-end', summary: '', check: () => {} }), /summary/);
});

test('dispatch runs the event hooks in pack order', () => {
  const seen = [];
  const pack = hookPack([
    hook({ id: 'first', event: 'run-start', summary: 's1', check: () => { seen.push('first'); return { ok: true }; } }),
    hook({ id: 'second', event: 'run-start', summary: 's2', check: () => { seen.push('second'); return { ok: true }; } }),
    hook({ id: 'other-event', event: 'run-end', summary: 's3', check: () => { seen.push('never'); return { ok: true }; } }),
  ]);
  const results = runHooks(pack, 'run-start', {});
  assert.deepEqual(seen, ['first', 'second']);
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.passed));
});

test('a check returning ok false fails, and a throw is a failed check, never a pass', () => {
  const pack = hookPack([
    hook({
      id: 'failing',
      event: 'before-tool',
      summary: 's',
      check: () => ({ ok: false, message: 'args malformed' }),
    }),
    hook({
      id: 'throwing',
      event: 'before-tool',
      summary: 's',
      check: () => { throw new Error('invariant broken'); },
    }),
  ]);
  const results = runHooks(pack, 'before-tool', {});
  assert.equal(results[0].passed, false);
  assert.match(results[0].detail, /args malformed/);
  assert.equal(results[1].passed, false);
  assert.match(results[1].detail, /check threw: invariant broken/);
});

test('a hook pack refuses duplicates and unknown events for dispatch', () => {
  const a = hook({ id: 'dupe', event: 'run-start', summary: 's', check: () => ({ ok: true }) });
  assert.throws(() => hookPack([a, a]), /duplicate hook id/);
  assert.throws(() => runHooks(hookPack([]), 'midnight', {}), /unknown event/);
});

test('a recipe steps through tools and skills and freezes', () => {
  const aRecipe = recipe({
    id: 'retire-a-note',
    objective: 'Find the note that outlived its purpose and forget it.',
    steps: [
      { skill: 'pre-flight-review' },
      { tool: 'memory.note.list', note: 'Find the note scope first.' },
      { tool: 'memory.note.delete' },
    ],
  });
  assert.equal(aRecipe.steps.length, 3);
  assert.throws(() => { aRecipe.steps[0].skill = 'renamed'; }, TypeError);
});

test('recipe steps are one kind each: both keys or neither rejects', () => {
  assert.throws(
    () => recipe({ id: 'r', objective: 'o', steps: [{ tool: 'x.read', skill: 's' }] }),
    /both a tool step and a skill step/
  );
  assert.throws(
    () => recipe({ id: 'r', objective: 'o', steps: [{ note: 'nothing here' }] }),
    /must be a tool step/
  );
  assert.throws(
    () => recipe({ id: 'r', objective: 'o', steps: [] }),
    /at least one step/
  );
});

test('checkRecipe resolves references: dangling tool or skill is a check-time defect', () => {
  const tools = toolPack([
    toolFace({ id: 'memory.note.list', effect: 'read', connector: 'memory-binding', summary: 'List notes.' }),
    toolFace({ id: 'memory.note.delete', effect: 'destructive', connector: 'memory-binding', summary: 'Forget a note.' }),
  ]);
  const skills = skillPack([
    skill({ name: 'pre-flight-review', summary: 'Check before destructive calls.', instructions: 'Read the effect class.', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }),
  ]);
  const good = recipe({
    id: 'retire-a-note',
    objective: 'Find and forget the note.',
    steps: [
      { skill: 'pre-flight-review' },
      { tool: 'memory.note.list' },
      { tool: 'memory.note.delete' },
    ],
  });
  assert.equal(checkRecipe(good, tools, skills).ok, true);

  const dangling = recipe({
    id: 'retire-a-ghost-note',
    objective: 'Forget what does not exist.',
    steps: [
      { skill: 'pre-flight-review' },
      { tool: 'memory.note.list' },
      { tool: 'memory.ghost.delete' },
    ],
  });
  const bad = checkRecipe(dangling, tools, skills);
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0], /references tool "memory.ghost.delete"/);

  const unknownSkill = recipe({
    id: 'use-unknown-skill',
    objective: 'Load what nobody packaged.',
    steps: [{ skill: 'not-packaged' }],
  });
  const badSkill = checkRecipe(unknownSkill, tools, skills);
  assert.equal(badSkill.ok, false);
  assert.match(badSkill.errors[0], /references skill "not-packaged"/);
});

test('a cookbook dedupes by id', () => {
  const a = recipe({ id: 'one', objective: 'o', steps: [{ tool: 'memory.note.list' }] });
  assert.throws(() => cookbook([a, a]), /duplicate recipe id/);
  const book = cookbook([a]);
  assert.equal(book.recipe('one').id, 'one');
  assert.equal(book.recipe('missing'), null);
});

test('end to end: a family memory pack validates face, skill, hook, and recipe together', () => {
  const tools = toolPack([
    toolFace({ id: 'memory.note.create', effect: 'write', connector: 'memory-binding', summary: 'Add a durable, scoped note.' }),
    toolFace({ id: 'memory.note.list', effect: 'read', connector: 'memory-binding', summary: 'List notes.' }),
    toolFace({ id: 'memory.note.read', effect: 'read', connector: 'memory-binding', summary: 'Read one note.' }),
    toolFace({ id: 'memory.note.delete', effect: 'destructive', connector: 'memory-binding', summary: 'Forget a note.' }),
  ]);
  const skills = skillPack([
    skill({ name: 'pre-flight-review', summary: 'Check before destructive calls.', instructions: 'Read the effect class. Confirm the scope.', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }),
  ]);
  const hooks = hookPack([
    hook({
      id: 'destructive-needs-note',
      event: 'before-tool',
      summary: 'A delete call carries the note id it will forget.',
      check: (payload) =>
        payload.toolId?.endsWith('.delete') === true && payload.args?.id
          ? { ok: true, message: 'note id present' }
          : { ok: false, message: 'a delete without a note id forgets nothing in particular' },
    }),
  ]);
  const aRecipe = recipe({
    id: 'retire-a-note',
    objective: 'Find the note that outlived its purpose and forget it.',
    steps: [
      { skill: 'pre-flight-review' },
      { tool: 'memory.note.list', note: 'Find the scope first.' },
      { tool: 'memory.note.delete' },
    ],
  });

  assert.equal(checkRecipe(aRecipe, tools, skills).ok, true);
  assert.equal(
    runHooks(hooks, 'before-tool', { toolId: 'memory.note.delete', args: { id: 'n-1' } })[0].passed,
    true
  );
  assert.equal(
    runHooks(hooks, 'before-tool', { toolId: 'memory.note.delete', args: {} })[0].passed,
    false
  );
});
