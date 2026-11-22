// Skill names name the working method, never a vendor or product. Contract: skills.md rule 4

import test from 'node:test';
import assert from 'node:assert/strict';

import { VENDOR_NAMES, skill, skillPack, SkillError, parseToolId } from '../src/index.mjs';

test('the vendor list is the vendor half of the tool-id grammar list', () => {
  assert.deepEqual([...VENDOR_NAMES].sort(), [
    'anthropic', 'chatgpt', 'claude', 'copilot', 'cursor', 'gemini', 'grok', 'openai',
  ]);
  for (const name of VENDOR_NAMES) {
    assert.throws(() => parseToolId(`docs.${name}.read`), /vendor or protocol name/);
  }
});

test('a skill name carrying a vendor word is refused', () => {
  for (const name of ['claude-review', 'openai-prompting', 'review-with-gemini', 'anthropic']) {
    assert.throws(
      () => skill({ name, summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }),
      (error) => error instanceof SkillError && /vendor or product name/.test(error.message),
    );
  }
});

test('the check matches whole words of the name, not substrings', () => {
  assert.equal(skill({ name: 'claudette-notes', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }).name, 'claudette-notes');
  assert.equal(skill({ name: 'pre-flight-review', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }).name, 'pre-flight-review');
});

test('protocol words stay allowed in skill names', () => {
  assert.equal(skill({ name: 'http-caching', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }).name, 'http-caching');
  assert.equal(skill({ name: 'grpc-error-mapping', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] }).name, 'grpc-error-mapping');
});

test('a pack refuses a frozen skill with a vendor name', () => {
  const frozen = Object.freeze({ name: 'copilot-tips', summary: 's', instructions: 'i', procedure: ['Read the face.'], guardrails: ['No unadmitted effect.'], verification: ['The scope matches.'] });
  assert.throws(() => skillPack([frozen]), SkillError);
});
