import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as drosera from '../src/index.mjs';
import { checkSchema, validateValue } from '../src/schema.mjs';

const { checkRecipe, parseToolId, toolFace, workspaceCodingRecipe, workspaceToolPack } = drosera;
const cases = [
  ['workspace.file.read', 'read', { path: 'note.txt', startLine: 1, endLine: 3 }, { path: 'note.txt', startLine: 0 }],
  ['workspace.dir.list', 'read', {}, { path: '' }],
  ['workspace.text.search', 'read', { query: 'literal.*', path: 'notes' }, { path: 'notes' }],
  ['workspace.file.write', 'write', { path: 'note.txt', content: '' }, { path: 'note.txt' }],
  ['workspace.file.update', 'write', { path: 'note.txt', oldText: 'before', newText: '' }, { path: 'note.txt', oldText: '', newText: 'after' }],
  ['workspace.shell.execute', 'write', { command: 'npm', args: ['test'] }, { command: 'npm', args: 'test' }],
  ['run.answer.create', 'read', { text: 'The checks passed.' }, { answer: 'The checks passed.' }],
];

test('workspace-tool-pack-declares-the-seven-approved-faces', () => {
  assert.deepEqual([...workspaceToolPack.ids()].sort(), cases.map(([id]) => id).sort());
  for (const [id, effect] of cases) {
    parseToolId(id);
    const face = workspaceToolPack.face(id);
    assert.equal(face.effect, effect);
    assert.deepEqual(toolFace(face), face);
    assert.equal(checkSchema(face.inputSchema).ok, true);
    assert.equal(Object.hasOwn(face, 'outputSchema'), false);
  }
});

test('workspace-tool-face-schemas-enforce-closed-arguments', () => {
  for (const [id, , valid, invalid] of cases) {
    const { inputSchema } = workspaceToolPack.face(id);
    assert.equal(validateValue(inputSchema, valid).ok, true, id);
    assert.equal(validateValue(inputSchema, invalid).ok, false, id);
    assert.equal(validateValue(inputSchema, { ...valid, unexpected: true }).ok, false, id);
  }
  assert.equal(validateValue(workspaceToolPack.face('workspace.shell.execute').inputSchema, { command: 'npm' }).ok, true);
});

test('workspace-coding-recipe-resolves-every-face', () => {
  assert.equal(workspaceCodingRecipe.id, 'workspace-coding');
  assert.deepEqual(checkRecipe(workspaceCodingRecipe, workspaceToolPack, null), { ok: true, errors: [] });
  assert.deepEqual(workspaceCodingRecipe.steps.map(item => item.tool).sort(), cases.map(([id]) => id).sort());
  assert.equal(workspaceCodingRecipe.steps.at(-1).tool, 'run.answer.create');
});
