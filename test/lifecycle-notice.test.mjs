// Lifecycle notices: the record a promotion or a deprecation leaves for hooks.
// Contracts: docs/contracts/skills.md ("Lifecycle notices") and docs/contracts/hooks.md.
// Ported from the predecessor's promoted and deprecated log events: the notice only,
// with no file, no environment variable, and no collector.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  skill, transitionSkill, lifecycleNotice, SkillError,
  EVENTS, hook, hookPack, runHooks,
} from '../src/index.mjs';

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

const draft = () => skill(base());
const review = () => transitionSkill(draft(), 'review');
const promoted = () => transitionSkill(review(), 'promoted', { approver: 'ada' });

test('a promotion from review is a notice naming its approver', () => {
  const notice = lifecycleNotice(review(), promoted());
  assert.deepEqual(notice, { name: 'scoped-review', from: 'review', to: 'promoted', approver: 'ada' });
  assert.ok(Object.isFrozen(notice));
});

test('a deprecation from any live state is a notice stating its reason', () => {
  const before = { intake: skill({ ...base(), lifecycle: 'intake' }), draft: draft(), review: review(), promoted: promoted() };
  for (const [from, record] of Object.entries(before)) {
    const after = transitionSkill(record, 'deprecated', { reason: 'Replaced.' });
    const notice = lifecycleNotice(record, after);
    assert.deepEqual(notice, { name: 'scoped-review', from, to: 'deprecated', reason: 'Replaced.' });
    assert.ok(Object.isFrozen(notice));
  }
});

test('a draft, an intake, and a review are not notices', () => {
  const intake = skill({ ...base(), lifecycle: 'intake' });
  const pairs = [
    [intake, transitionSkill(intake, 'draft')],
    [draft(), review()],
    [review(), transitionSkill(review(), 'draft')],
    [draft(), draft()],
  ];
  for (const [before, after] of pairs) {
    assert.throws(() => lifecycleNotice(before, after), SkillError, `${before.lifecycle} → ${after.lifecycle}`);
  }
});

test('a promotion not from review, a repeat deprecation, or a different skill is refused', () => {
  const retired = transitionSkill(promoted(), 'deprecated', { reason: 'Replaced.' });
  assert.throws(() => lifecycleNotice(draft(), promoted()), SkillError);           // draft is not review
  assert.throws(() => lifecycleNotice(promoted(), promoted()), SkillError);        // not a move
  assert.throws(() => lifecycleNotice(retired, retired), SkillError);              // deprecated is terminal
  const other = transitionSkill(transitionSkill(skill({ ...base(), name: 'other-review' }), 'review'), 'promoted', { approver: 'ada' });
  assert.throws(() => lifecycleNotice(review(), other), /same skill/);
  assert.throws(() => lifecycleNotice(review(), { ...promoted(), promotedBy: undefined }), SkillError); // not a valid record
  assert.throws(() => lifecycleNotice(undefined, promoted()), SkillError);
});

test('the two lifecycle events join the four run events, and hooks dispatch them', () => {
  for (const event of ['run-start', 'before-tool', 'after-tool', 'run-end', 'skill-promoted', 'skill-deprecated']) {
    assert.ok(EVENTS.has(event), event);
  }
  const seen = [];
  const pack = hookPack([
    hook({ id: 'promotion-names-approver', event: 'skill-promoted', summary: 'A promotion names its approver.',
      check: (notice) => { seen.push(notice.name); return { ok: typeof notice.approver === 'string' }; } }),
    hook({ id: 'deprecation-states-reason', event: 'skill-deprecated', summary: 'A deprecation states its reason.',
      check: (notice) => ({ ok: notice.reason.length > 0 }) }),
    hook({ id: 'throws-on-promotion', event: 'skill-promoted', summary: 'A failing check stays failed.',
      check: () => { throw new Error('broken check'); } }),
  ]);
  const promotedResults = runHooks(pack, 'skill-promoted', lifecycleNotice(review(), promoted()));
  assert.deepEqual(promotedResults.map((r) => [r.id, r.passed]), [['promotion-names-approver', true], ['throws-on-promotion', false]]);
  assert.match(promotedResults[1].detail, /check threw: broken check/);
  assert.deepEqual(seen, ['scoped-review']);
  const notice = lifecycleNotice(promoted(), transitionSkill(promoted(), 'deprecated', { reason: 'Replaced.' }));
  assert.deepEqual(runHooks(pack, 'skill-deprecated', notice).map((r) => [r.id, r.passed]), [['deprecation-states-reason', true]]);
});

test('transitionSkill stays pure, and the skills module imports nothing', () => {
  const source = readFileSync(new URL('../src/skills.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\b/m);
  assert.doesNotMatch(source, /process\.env|fetch\(|node:fs|node:http/);
  assert.doesNotMatch(transitionSkill.toString(), /lifecycleNotice|runHooks/);
  const record = transitionSkill(review(), 'promoted', { approver: 'ada' });
  assert.equal(Object.hasOwn(record, 'notice'), false);
});
