// Skill records: procedure, guardrails, verification, and the lifecycle.
// Contract: docs/contracts/skills.md

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  skill, skillPack, transitionSkill, SkillError, LIFECYCLE_STATES,
} from '../src/index.mjs';

const base = () => ({
  name: 'pre-flight-review',
  summary: 'Walk the checklist before any destructive call.',
  procedure: ['Read the effect class on the face.', 'Confirm the scope.', 'Then call.'],
  guardrails: ['Never call a destructive face without an admitted scope.'],
  verification: ['The recorded intent names the scope that was confirmed.'],
});

test('a skill record carries procedure, guardrails, and verification, and starts as a draft', () => {
  const record = skill(base());
  assert.deepEqual(record.procedure, base().procedure);
  assert.deepEqual(record.guardrails, base().guardrails);
  assert.deepEqual(record.verification, base().verification);
  assert.equal(record.lifecycle, 'draft');
  for (const field of ['procedure', 'guardrails', 'verification']) {
    assert.throws(() => { record[field].push('more'); }, TypeError);
  }
});

test('a summary alone is not a skill: each required part is checked', () => {
  for (const field of ['summary', 'procedure', 'guardrails', 'verification']) {
    const input = base();
    delete input[field];
    assert.throws(() => skill(input), (error) => error instanceof SkillError && error.issues.some((i) => i.startsWith(field)));
  }
  for (const bad of [[], [''], 'one step', [3]]) {
    assert.throws(() => skill({ ...base(), procedure: bad }), SkillError);
    assert.throws(() => skill({ ...base(), guardrails: bad }), SkillError);
    assert.throws(() => skill({ ...base(), verification: bad }), SkillError);
  }
  const { procedure, ...withoutProcedure } = base();
  assert.equal(procedure.length, 3);
  assert.throws(() => skill({ ...withoutProcedure, instructions: 'Read, confirm, call.' }), SkillError); // prose does not replace a procedure
});

test('a pack refuses a frozen record that is missing a required part', () => {
  const { verification, ...rest } = base();
  assert.equal(verification.length, 1);
  assert.throws(() => skillPack([Object.freeze(rest)]), SkillError);
  assert.equal(skillPack([skill(base())]).has('pre-flight-review'), true);
});

test('the lifecycle is draft, promoted, or deprecated', () => {
  assert.deepEqual([...LIFECYCLE_STATES], ['draft', 'promoted', 'deprecated']);
  assert.throws(() => skill({ ...base(), lifecycle: 'review' }), SkillError);
  assert.throws(() => skill({ ...base(), lifecycle: 'promoted' }), SkillError);      // names no approver
  assert.throws(() => skill({ ...base(), lifecycle: 'deprecated' }), SkillError);    // states no reason
  assert.throws(() => skill({ ...base(), promotedBy: 'ada' }), SkillError);          // a draft is not promoted
  assert.equal(skill({ ...base(), lifecycle: 'promoted', promotedBy: 'ada' }).promotedBy, 'ada');
});

test('a draft is promoted with an approver, and a promoted skill is deprecated with a reason', () => {
  const draft = skill(base());
  const promoted = transitionSkill(draft, 'promoted', { approver: 'ada' });
  assert.equal(promoted.lifecycle, 'promoted');
  assert.equal(promoted.promotedBy, 'ada');
  assert.equal(draft.lifecycle, 'draft');                                 // the given record is unchanged
  assert.throws(() => transitionSkill(draft, 'promoted'), SkillError);

  const deprecated = transitionSkill(promoted, 'deprecated', { reason: 'Replaced by the scoped review skill.' });
  assert.equal(deprecated.lifecycle, 'deprecated');
  assert.equal(deprecated.promotedBy, 'ada');
  assert.equal(deprecated.deprecatedReason, 'Replaced by the scoped review skill.');
  assert.throws(() => transitionSkill(promoted, 'deprecated'), SkillError);
  assert.equal(transitionSkill(draft, 'deprecated', { reason: 'Never adopted.' }).lifecycle, 'deprecated');
});

test('a deprecated skill does not transition, and no state moves to itself or back', () => {
  const deprecated = transitionSkill(skill(base()), 'deprecated', { reason: 'Never adopted.' });
  for (const to of ['draft', 'promoted', 'deprecated']) {
    assert.throws(() => transitionSkill(deprecated, to, { approver: 'ada', reason: 'again' }), /cannot move/);
  }
  const promoted = transitionSkill(skill(base()), 'promoted', { approver: 'ada' });
  assert.throws(() => transitionSkill(promoted, 'draft'), /cannot move/);
  assert.throws(() => transitionSkill(promoted, 'promoted', { approver: 'ada' }), /cannot move/);
  assert.throws(() => transitionSkill(skill(base()), 'review'), /cannot move/);
});
