import test from 'node:test';
import assert from 'node:assert/strict';

import { skill, skillCatalog, transitionSkill, SkillError } from '../src/index.mjs';

const draft = name => skill({
  name, summary: 'Review the source list.',
  procedure: ['Read the source list.'], guardrails: ['Keep evidence scoped to the task.'],
  verification: ['Every claim cites an admitted source.'],
  triggers: ['A claim needs evidence.'], inputs: ['The admitted sources.'],
  outputs: ['Claims with citations.'], examples: ['Cite the source id beside the claim.'],
  sources: ['docs/contracts/skills.md'],
});
const promote = record => transitionSkill(record, 'promoted', { approver: 'reviewer' });

test('a skill catalog lists and reads only promoted skills with an explicit MIT license', () => {
  const entry = { skill: promote(draft('review-sources')), license: 'MIT' };
  const deprecated = transitionSkill(promote(draft('retired-review')), 'deprecated', { reason: 'Replaced.' });
  const catalog = skillCatalog([
    entry,
    { skill: draft('draft-review'), license: 'MIT', public: true },
    { skill: deprecated, license: 'MIT' },
    { skill: promote(draft('other-license')), license: 'Apache-2.0' },
    { skill: promote(draft('lowercase-license')), license: 'mit' },
    { skill: promote(draft('missing-license')) },
  ]);
  const item = catalog.read('review-sources');
  assert.deepEqual(item, { slug: 'review-sources', license: 'MIT', skill: entry.skill });
  assert.deepEqual(catalog.list(), [item]);
  assert.ok(Object.isFrozen(catalog.list()));
  assert.ok(Object.isFrozen(item));
  for (const slug of ['draft-review', 'retired-review', 'other-license', 'lowercase-license', 'missing-license', 'missing']) {
    assert.throws(() => catalog.read(slug), SkillError);
  }
});

test('a skill catalog applies skill validation and refuses ambiguous slugs', () => {
  const valid = promote(draft('check-evidence'));
  const invalid = Object.freeze({ ...valid, verification: undefined });
  assert.throws(() => skillCatalog([{ skill: invalid, license: 'MIT' }]), SkillError);
  assert.throws(() => skillCatalog([
    { skill: valid, license: 'MIT' }, { skill: draft(valid.name), license: 'MIT' },
  ]), /duplicate skill name/);
});

test('a promoted MIT skill missing a section list never enters the catalog', () => {
  const valid = promote(draft('check-sources'));
  for (const field of ['triggers', 'inputs', 'outputs', 'examples', 'sources']) {
    const invalid = Object.freeze({ ...valid, [field]: [] });
    assert.throws(() => skillCatalog([{ skill: invalid, license: 'MIT' }]), SkillError);
  }
});
