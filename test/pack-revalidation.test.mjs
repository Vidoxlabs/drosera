// A pack checks every entry, wherever it came from. Frozen is not valid.
// Contracts: tools.md, skills.md, hooks.md, cookbook.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  VERSION,
  toolFace,
  toolPack,
  FaceError,
  skill,
  skillPack,
  SkillError,
  hook,
  hookPack,
  HookError,
  recipe,
  cookbook,
  RecipeError,
} from '../src/index.mjs';

test('a frozen object that is not a valid face is refused by the pack', () => {
  const badId = Object.freeze({ id: 'Memory.Note.Read', effect: 'read', connector: 'c', summary: 's' });
  const noSummary = Object.freeze({ id: 'memory.note.read', effect: 'read', connector: 'c', summary: '' });
  const vendorId = Object.freeze({ id: 'memory.openai.read', effect: 'read', connector: 'c', summary: 's' });
  for (const bad of [badId, noSummary, vendorId]) {
    assert.throws(() => toolPack([bad]), FaceError);
  }
});

test('a frozen object that is not a valid skill is refused by the pack', () => {
  const noInstructions = Object.freeze({ name: 'pre-flight', summary: 's', instructions: '', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] });
  const badName = Object.freeze({ name: 'PreFlight', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] });
  for (const bad of [noInstructions, badName]) {
    assert.throws(() => skillPack([bad]), SkillError);
  }
});

test('a frozen record whose check is prose is not a hook, and the pack refuses it', () => {
  const prose = Object.freeze({ id: 'args-ok', event: 'before-tool', summary: 's', check: 'check the args' });
  assert.throws(() => hookPack([prose]), HookError);
  const noSummary = Object.freeze({ id: 'args-ok', event: 'before-tool', summary: '', check: () => ({ ok: true }) });
  assert.throws(() => hookPack([noSummary]), HookError);
});

test('a frozen object that is not a valid recipe is refused by the cookbook', () => {
  const noSteps = Object.freeze({ id: 'empty', objective: 'o', steps: Object.freeze([]) });
  const bothKinds = Object.freeze({ id: 'mixed', objective: 'o', steps: Object.freeze([{ tool: 'memory.note.list', skill: 's' }]) });
  for (const bad of [noSteps, bothKinds]) {
    assert.throws(() => cookbook([bad]), RecipeError);
  }
});

test('valid entries still pack, and a hook keeps the very check it was given', () => {
  const check = () => ({ ok: true });
  const hooks = hookPack([hook({ id: 'args-ok', event: 'before-tool', summary: 'Args are present.', check })]);
  assert.equal(hooks.hook('args-ok').check, check);

  const face = toolFace({ id: 'memory.note.read', effect: 'read', connector: 'memory-binding', summary: 'Read one note.' });
  assert.equal(toolPack([face]).face('memory.note.read').summary, 'Read one note.');
  assert.equal(skillPack([skill({ name: 'pre-flight', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] })]).has('pre-flight'), true);
  assert.equal(cookbook([recipe({ id: 'one', objective: 'o', steps: [{ tool: 'memory.note.read' }] })]).size, 1);
});

test('plain unfrozen input is validated the same way as before', () => {
  assert.throws(() => toolPack([{ id: 'memory.note.read', effect: 'scan', connector: 'c', summary: 's' }]), FaceError);
  assert.equal(toolPack([{ id: 'memory.note.read', effect: 'read', connector: 'c', summary: 's' }]).size, 1);
});

test('the exported version matches the package', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version);
});
