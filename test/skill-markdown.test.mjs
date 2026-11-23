// Skill documents: markdown text the caller already holds, turned into the record
// `skill()` accepts. Contract: docs/contracts/skills.md ("Skill documents").
// Ported from the predecessor skill validator's REQUIRED_SECTIONS and
// REQUIRED_FRONTMATTER_FIELDS, on text only: no file, no directory, no path.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  skill, skillFromMarkdown, SkillError, SKILL_HEADINGS, LIFECYCLE_STATES,
} from '../src/index.mjs';

const HEADINGS = [
  'Summary',
  'When to Use (Triggers)',
  'Inputs',
  'Outputs',
  'Procedure / Steps',
  'Guardrails',
  'Examples',
  'Verification',
  'Sources / Evidence',
];

const SECTIONS = Object.freeze({
  'Summary': 'Walk the checklist before a destructive call.',
  'When to Use (Triggers)': '- Before any call whose face declares a destructive effect.',
  'Inputs': '- The face and its effect class.\n- The admitted scope.',
  'Outputs': '- A confirmed scope recorded with the intent.',
  'Procedure / Steps': '1. Read the effect class on the face.\n2. Confirm the scope\n   with the owner.\n3. Then call.',
  'Guardrails': '- Never call a destructive face without an admitted scope.',
  'Examples': '### Good\n\n> Confirm the scope, then\n> delete one file.\n\n### Bad\n\n> Delete without reading the face.',
  'Verification': '- The recorded intent names the scope that was confirmed.',
  'Sources / Evidence': '- docs/contracts/skills.md',
});

// The predecessor's published frontmatter: a folded description and a nested block.
const FRONT = Object.freeze([
  'name: pre-flight-review',
  'description: >-',
  '  Check the face and the scope',
  '  before a destructive call.',
  'license: MIT',
  'metadata:',
  '  status: promoted',
  '  tags: [review]',
]);

function doc({ front = FRONT, sections = SECTIONS } = {}) {
  const body = Object.entries(sections).flatMap(([heading, text]) => [`## ${heading}`, '', text, '']);
  return ['---', ...front, '---', '', '# Pre-flight review', '', ...body].join('\n');
}

const refusedFor = (text, pattern) => assert.throws(
  () => skillFromMarkdown(text),
  (error) => error instanceof SkillError && error.issues.some((issue) => pattern.test(issue)),
);

test('the nine headings are the predecessor validator\'s required sections, in order', () => {
  assert.deepEqual([...SKILL_HEADINGS], HEADINGS);
  assert.ok(Object.isFrozen(SKILL_HEADINGS));
});

test('a complete document becomes the record skill() accepts', () => {
  const record = skillFromMarkdown(doc());
  assert.equal(record.name, 'pre-flight-review');
  assert.equal(record.summary, 'Check the face and the scope before a destructive call.\n\nWalk the checklist before a destructive call.');
  assert.deepEqual(record.triggers, ['Before any call whose face declares a destructive effect.']);
  assert.deepEqual(record.inputs, ['The face and its effect class.', 'The admitted scope.']);
  assert.deepEqual(record.outputs, ['A confirmed scope recorded with the intent.']);
  assert.deepEqual(record.procedure, ['Read the effect class on the face.', 'Confirm the scope with the owner.', 'Then call.']);
  assert.deepEqual(record.guardrails, ['Never call a destructive face without an admitted scope.']);
  assert.deepEqual(record.examples, ['Good: Confirm the scope, then delete one file.', 'Bad: Delete without reading the face.']);
  assert.deepEqual(record.verification, ['The recorded intent names the scope that was confirmed.']);
  assert.deepEqual(record.sources, ['docs/contracts/skills.md']);
  assert.equal(record.lifecycle, 'draft');                    // a nested metadata status is not read
  assert.ok(Object.isFrozen(record));
  assert.deepEqual(skill(record), record);
});

test('each missing heading is refused and named', () => {
  for (const heading of HEADINGS) {
    const sections = { ...SECTIONS };
    delete sections[heading];
    refusedFor(doc({ sections }), new RegExp(`missing heading "${heading.replace(/[()/]/g, '\\$&')}"`));
  }
});

test('a heading whose body is empty is refused and named', () => {
  for (const heading of HEADINGS) {
    refusedFor(doc({ sections: { ...SECTIONS, [heading]: '' } }), new RegExp(`heading "${heading.replace(/[()/]/g, '\\$&')}" has an empty body`));
  }
  refusedFor(doc({ sections: { ...SECTIONS, Examples: '### Good\n\n### Bad' } }), /heading "Examples" has an empty body/);
});

test('every missing or empty heading is named in one refusal', () => {
  const { Inputs: _inputs, Outputs: _outputs, ...rest } = SECTIONS;
  assert.throws(() => skillFromMarkdown(doc({ sections: { ...rest, Guardrails: '' } })), (error) => {
    assert.deepEqual(error.issues.filter((issue) => /heading/.test(issue)), [
      'missing heading "Inputs"', 'missing heading "Outputs"', 'heading "Guardrails" has an empty body',
    ]);
    return true;
  });
  const front = FRONT.filter((line) => !line.startsWith('name:'));
  assert.throws(() => skillFromMarkdown(doc({ front, sections: rest })), (error) => {
    assert.ok(error.issues.includes('frontmatter must give name as non-empty text'));
    assert.ok(error.issues.includes('missing heading "Inputs"'));
    return true;
  });
});

test('only a level one or two heading outside a code fence counts', () => {
  const nested = { ...SECTIONS };
  delete nested.Inputs;
  nested.Summary = `${SECTIONS.Summary}\n\n### Inputs\n\n- Hidden under the summary.`;
  refusedFor(doc({ sections: nested }), /missing heading "Inputs"/);
  const fenced = { ...SECTIONS };
  delete fenced.Inputs;
  fenced.Examples = '```markdown\n## Inputs\n- Only an example.\n```';
  refusedFor(doc({ sections: fenced }), /missing heading "Inputs"/);
  const tilde = { ...SECTIONS };
  delete tilde.Inputs;
  tilde.Examples = '~~~\n## Inputs\n~~~';
  refusedFor(doc({ sections: tilde }), /missing heading "Inputs"/);
});

test('a required heading given twice is refused', () => {
  const text = `${doc()}\n## Inputs\n\n- A second list.\n`;
  refusedFor(text, /heading "Inputs" appears more than once/);
});

test('items are list items, paragraphs, and code blocks, labelled by the subheading above them', () => {
  const sections = {
    ...SECTIONS,
    Summary: 'First paragraph\nwraps here.\n\nSecond paragraph.',
    Inputs: '- Parent item\n  - Nested item\n* Star item\n+ Plus item\n\nA closing paragraph.',
    'Procedure / Steps': '1) Paren step.\n2. Dot step\n   continues.\n\n   And keeps a second paragraph.',
    Examples: '### Good\n\n```text\ncall memory.note.delete\nwith scope one-file\n```\n\n### Bad\n\nNo scope was read.',
  };
  const record = skillFromMarkdown(doc({ sections }));
  assert.equal(record.summary, 'Check the face and the scope before a destructive call.\n\nFirst paragraph wraps here.\n\nSecond paragraph.');
  assert.deepEqual(record.inputs, ['Parent item', 'Nested item', 'Star item', 'Plus item', 'A closing paragraph.']);
  assert.deepEqual(record.procedure, ['Paren step.', 'Dot step continues. And keeps a second paragraph.']);
  assert.deepEqual(record.examples, ['Good: call memory.note.delete\nwith scope one-file', 'Bad: No scope was read.']);
  const tilde = skillFromMarkdown(doc({ sections: { ...SECTIONS, Examples: '~~~\n~~~\n\n~~~text\n  kept as written\n~~~' } }));
  assert.deepEqual(tilde.examples, ['  kept as written']);         // the empty block is dropped
});

test('a document opens with a frontmatter block that gives name and description', () => {
  refusedFor(doc().replace(/^---\n/, ''), /opens with a frontmatter block/);
  refusedFor(doc().replace('\n---\n\n# Pre-flight', '\n\n# Pre-flight'), /opens with a frontmatter block/);
  refusedFor(doc({ front: FRONT.filter((line) => !line.startsWith('name:')) }), /frontmatter must give name/);
  refusedFor(doc({ front: ['name: pre-flight-review', 'license: MIT'] }), /frontmatter must give description/);
  refusedFor(doc({ front: ['name: pre-flight-review', 'description:'] }), /frontmatter must give description/);
  refusedFor(doc({ front: ['name:', '  first: pre-flight', 'description: d'] }), /frontmatter must give name/);
  for (const bad of [undefined, null, 42, { text: doc() }]) {
    assert.throws(() => skillFromMarkdown(bad), SkillError);
  }
});

test('frontmatter is read as top-level keys; an unreadable or repeated key is refused', () => {
  const quoted = skillFromMarkdown(doc({ front: [
    '# a comment line',
    "name: 'pre-flight-review'",
    'description: "Say \\"stop\\" first." # trailing comment',
    'notes: |',
    '  line one',
    '  line two',
  ] }));
  assert.equal(quoted.name, 'pre-flight-review');
  assert.ok(quoted.summary.startsWith('Say "stop" first.\n\n'));
  const literal = skillFromMarkdown(doc({ front: ['name: pre-flight-review', 'description: |', '  Line one.', '  Line two.'] }));
  assert.ok(literal.summary.startsWith('Line one.\nLine two.\n\n'));
  const plain = skillFromMarkdown(doc({ front: ['name: pre-flight-review', 'description: Fix issue#42 before a call # aside'] }));
  assert.ok(plain.summary.startsWith('Fix issue#42 before a call\n\n'));   // a # after a space starts a comment
  refusedFor(doc({ front: ['name: pre-flight-review', 'description: Check the face', '  and the scope.'] }), /frontmatter line 2 continues its value/);
  refusedFor(doc({ front: ['name: pre-flight-review', 'description: >2', '   Indented.'] }), /frontmatter line 2 uses a block form/);
  refusedFor(doc({ front: ['name: pre-flight-review', "description: 'Unclosed"] }), /frontmatter line 2 has an unclosed quote/);
  refusedFor(doc({ front: ['name: pre-flight-review', 'description: "Unclosed'] }), /frontmatter line 2 has an unclosed quote/);
  const escapes = skillFromMarkdown(doc({ front: ['name: pre-flight-review', "description: 'It''s a back\\slash.'"] }));
  assert.ok(escapes.summary.startsWith("It's a back\\slash.\n\n"));
  const doubled = skillFromMarkdown(doc({ front: ['name: pre-flight-review', 'description: "One \\\\ two."'] }));
  assert.ok(doubled.summary.startsWith('One \\ two.\n\n'));
  const folded = skillFromMarkdown(doc({ front: ['name: pre-flight-review', 'description: >', '  First line', '  joined.', '', '  After a break.'] }));
  assert.ok(folded.summary.startsWith('First line joined.\nAfter a break.\n\n'));
  refusedFor(doc({ front: [...FRONT, 'not a key'] }), /frontmatter line 9 is not a top-level key/);
  refusedFor(doc({ front: ['  indented: first', ...FRONT] }), /frontmatter line 1 is not a top-level key/);
  refusedFor(doc({ front: [...FRONT, 'name: other-name'] }), /frontmatter key "name" appears more than once/);
  refusedFor(doc({ front: ['name: pre-flight-review', 'description: "Say \\u0041"'] }), /frontmatter line 2/);
});

test('the lifecycle stays draft unless the frontmatter states one, and skill() still checks it', () => {
  const at = (...lines) => skillFromMarkdown(doc({ front: [...FRONT, ...lines] }));
  assert.equal(at().lifecycle, 'draft');
  for (const state of ['intake', 'draft', 'review']) assert.equal(at(`lifecycle: ${state}`).lifecycle, state);
  const promoted = at('lifecycle: promoted', 'promotedBy: ada');
  assert.equal(promoted.promotedBy, 'ada');
  const retired = at('lifecycle: deprecated', 'deprecatedReason: Replaced.');
  assert.equal(retired.deprecatedReason, 'Replaced.');
  assert.throws(() => at('lifecycle: promoted'), /names who promoted it/);       // skill() is not skipped
  assert.throws(() => at('lifecycle: deprecated'), /states why/);
  assert.throws(() => at('lifecycle: Promoted', 'promotedBy: ada'), /lifecycle must be one of/);
  assert.throws(() => at('lifecycle: stable'), /lifecycle must be one of/);
  assert.throws(() => at('promotedBy: ada'), /draft skill carries neither/);
  refusedFor(doc({ front: [...FRONT, 'lifecycle:'] }), /frontmatter lifecycle must be non-empty text when present/);
  assert.deepEqual([...LIFECYCLE_STATES], ['intake', 'draft', 'review', 'promoted', 'deprecated']);
});

test('the result passes through skill(): its name rules still hold', () => {
  for (const name of ['claude-review', 'Pre-Flight', 'pre flight']) {
    const front = [`name: ${name}`, ...FRONT.slice(1)];
    assert.throws(() => skillFromMarkdown(doc({ front })), (error) => error instanceof SkillError && error.issues.some((i) => i.startsWith('name')));
  }
});

test('carriage-return line endings read the same as newlines', () => {
  assert.deepEqual(skillFromMarkdown(doc().replace(/\n/g, '\r\n')), skillFromMarkdown(doc()));
});

test('the document module reads no file, walks no directory, and calls no network', () => {
  const source = readFileSync(new URL('../src/skill-markdown.mjs', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/^\s*import\b[^;]*from\s+'([^']+)'/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ['./skills.mjs']);
  assert.doesNotMatch(source, /process\.|fetch\(|node:|readFile|readdir|import\(/);
});
