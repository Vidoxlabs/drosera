// The promotion path: intake, draft, review, promoted, deprecated.
// Contract: docs/contracts/skills.md ("Lifecycle"). States ported from the
// predecessor skill lifecycle; no file, clock, or quality gate is ported.

import test from 'node:test';
import assert from 'node:assert/strict';

import { skill, skillCatalog, transitionSkill, SkillError, LIFECYCLE_STATES } from '../src/index.mjs';

const base = () => ({
  name: 'scoped-review',
  summary: 'Review a change against its admitted scope.',
  procedure: ['Read the scope.', 'Read the change.'],
  guardrails: ['Approve nothing outside the scope.'],
  verification: ['Every changed path is inside the scope.'],
  triggers: ['A change asks for review.'],
  inputs: ['The change and its scope.'],
  outputs: ['A verdict naming each path.'],
  examples: ['A one-file change inside its scope is approved.'],
  sources: ['docs/contracts/skills.md'],
});

const ALLOWED = {
  intake: ['draft', 'deprecated'],
  draft: ['review', 'deprecated'],
  review: ['promoted', 'draft', 'deprecated'],
  promoted: ['deprecated'],
  deprecated: [],
};

const recordIn = (state) => skill({
  ...base(),
  lifecycle: state,
  ...(state === 'promoted' || state === 'deprecated' ? { promotedBy: 'ada' } : {}),
  ...(state === 'deprecated' ? { deprecatedReason: 'Replaced.' } : {}),
});

const options = { approver: 'ada', reason: 'Replaced.' };

test('the lifecycle states are intake, draft, review, promoted, and deprecated', () => {
  assert.deepEqual([...LIFECYCLE_STATES], ['intake', 'draft', 'review', 'promoted', 'deprecated']);
  assert.ok(Object.isFrozen(LIFECYCLE_STATES));
  assert.equal(skill(base()).lifecycle, 'draft');               // the default stays draft
  assert.throws(() => skill({ ...base(), lifecycle: 'Review' }), SkillError);
});

test('each state moves only to the states the path allows', () => {
  for (const from of LIFECYCLE_STATES) {
    for (const to of LIFECYCLE_STATES) {
      const move = () => transitionSkill(recordIn(from), to, options);
      if (ALLOWED[from].includes(to)) {
        assert.equal(move().lifecycle, to, `${from} → ${to}`);
      } else {
        assert.throws(move, /cannot move/, `${from} → ${to}`);
      }
    }
  }
});

test('a draft is not promoted directly, even with an approver', () => {
  assert.throws(() => transitionSkill(recordIn('draft'), 'promoted', { approver: 'ada' }), /a draft skill cannot move to "promoted"/);
  const reviewed = transitionSkill(recordIn('draft'), 'review');
  const promoted = transitionSkill(reviewed, 'promoted', { approver: 'ada' });
  assert.equal(promoted.lifecycle, 'promoted');
  assert.equal(promoted.promotedBy, 'ada');
  assert.equal(reviewed.lifecycle, 'review');                    // the given record is unchanged
});

test('promotion from review still names its approver', () => {
  assert.throws(() => transitionSkill(recordIn('review'), 'promoted'), /approver/);
  assert.throws(() => transitionSkill(recordIn('review'), 'promoted', { approver: '' }), /approver/);
});

test('intake, draft, and review carry no promoter and no deprecation reason', () => {
  for (const state of ['intake', 'draft', 'review']) {
    assert.throws(() => skill({ ...base(), lifecycle: state, promotedBy: 'ada' }), SkillError, state);
    assert.throws(() => skill({ ...base(), lifecycle: state, deprecatedReason: 'x' }), SkillError, state);
  }
});

test('a move back to draft clears the promoter', () => {
  const back = transitionSkill(recordIn('review'), 'draft', { approver: 'ada' });
  assert.equal(back.lifecycle, 'draft');
  assert.equal(Object.hasOwn(back, 'promotedBy'), false);
  assert.equal(Object.hasOwn(back, 'deprecatedReason'), false);
});

test('deprecation states its reason from every live state and keeps the section lists', () => {
  for (const from of ['intake', 'draft', 'review', 'promoted']) {
    assert.throws(() => transitionSkill(recordIn(from), 'deprecated'), /reason/);
    const retired = transitionSkill(recordIn(from), 'deprecated', { reason: 'Replaced.' });
    assert.equal(retired.deprecatedReason, 'Replaced.');
    assert.deepEqual(retired.sources, base().sources);
    assert.equal(retired.promotedBy, from === 'promoted' ? 'ada' : undefined);
  }
});

test('the catalog lists a skill that reached promoted through review, and no earlier state', () => {
  const promoted = transitionSkill(transitionSkill(recordIn('draft'), 'review'), 'promoted', { approver: 'ada' });
  const catalog = skillCatalog([
    { skill: promoted, license: 'MIT' },
    { skill: { ...recordIn('review'), name: 'in-review' }, license: 'MIT' },
    { skill: { ...recordIn('intake'), name: 'in-intake' }, license: 'MIT' },
  ]);
  assert.deepEqual(catalog.list().map((item) => item.slug), ['scoped-review']);
  assert.throws(() => catalog.read('in-review'), SkillError);
});
