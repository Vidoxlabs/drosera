import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { FaceError, toolFace, toolPack } from '../src/index.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/seed-schema-parity.json', import.meta.url), 'utf8'));
const baseFace = {
  id: 'docs.file.read',
  effect: 'read',
  connector: 'fixture',
  summary: 'Read fixture data.',
};

function outcome(result) {
  return { ok: result.ok, errors: result.errors.map(error => error.path).sort() };
}

test('drosera-face-schema-parity', () => {
  assert.deepEqual(toolFace(baseFace), baseFace);
  for (const name of ['inputSchema', 'outputSchema']) {
    for (const { schema, errors } of fixtures.cases) {
      const input = { ...baseFace, [name]: schema };
      if (errors.length > 0) {
        assert.throws(() => toolFace(input), FaceError);
        assert.throws(() => toolPack([input]), FaceError);
      } else {
        assert.deepEqual(toolFace(input)[name], schema);
        assert.deepEqual(toolPack([input]).face(baseFace.id)[name], schema);
      }
    }
    assert.throws(() => toolFace({ ...baseFace, [name]: undefined }), FaceError);
  }

  const schema = { properties: { count: { type: 'integer' } }, required: ['count'] };
  const face = toolFace({ ...baseFace, outputSchema: schema });
  schema.properties.count.type = 'string';
  schema.required.push('ignored');
  assert.equal(face.outputSchema.properties.count.type, 'integer');
  assert.deepEqual(face.outputSchema.required, ['count']);
  assert.ok(Object.isFrozen(face.outputSchema.properties.count));
  assert.ok(Object.isFrozen(face.outputSchema.required));
});

test('parity-fixtures-agree-with-seed', async () => {
  const source = readFileSync(new URL('../src/schema.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(fixtures.seedCommit, /^[a-f0-9]{40}$/);
  assert.equal(createHash('sha256').update(source).digest('hex'), fixtures.schemaSha256);
  const { checkSchema, validateValue } = await import('../src/schema.mjs');
  for (const { name, schema, errors, values } of fixtures.cases) {
    assert.deepEqual(outcome(checkSchema(schema)), { ok: errors.length === 0, errors }, name);
    for (const { input, errors } of values) {
      assert.deepEqual(outcome(validateValue(schema, input)), { ok: errors.length === 0, errors }, name);
    }
  }
});
