// Drosera pack: tool faces under seed's neutral tool-id grammar.
// The grammar is seed's contract (docs/contracts/tool-id.md); this mirror
// exists so packs validate offline. When they disagree, seed's grammar wins.
// Refreshing this copy is a drosera change. A seed change does not edit it.

import { checkSchema } from './schema.mjs';

const SEGMENT = /^[a-z][a-z0-9-]*$/;
const INFRASTRUCTURE_LIKE = /^(?:v\d+|ct\d+|node\d+|host\d+|stage\d+)$/;
const FORBIDDEN_SEGMENTS = new Set([
  'openai', 'anthropic', 'claude', 'chatgpt', 'gemini', 'grok', 'copilot', 'cursor',
  'http', 'https', 'websocket', 'grpc', 'sdk',
]);
const VERBS = new Set([
  'read', 'write', 'create', 'update', 'delete', 'list', 'search', 'execute', 'cancel',
  'verify',
]);

export const EFFECT_CLASSES = Object.freeze(
  new Set(['read', 'write', 'destructive', 'credential'])
);

export class ToolIdError extends Error {}
export class FaceError extends Error {
  constructor(issues) {
    super(Array.isArray(issues) ? `invalid tool face: ${issues.join('; ')}` : issues);
    this.name = 'FaceError';
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

export function parseToolId(id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new ToolIdError('a tool ID must be a non-empty string');
  }
  if (id.startsWith('.') || id.endsWith('.')) {
    throw new ToolIdError(`tool ID "${id}" starts or ends with a separator`);
  }
  const segments = id.split('.');
  if (segments.length < 2) throw new ToolIdError(`tool ID "${id}" needs at least domain and verb`);
  if (segments.length > 4) throw new ToolIdError(`tool ID "${id}" has more than four segments`);
  for (const segment of segments) {
    if (!SEGMENT.test(segment)) {
      throw new ToolIdError(
        `segment "${segment}" in "${id}" must be lowercase letters, digits, or hyphens, starting with a letter`
      );
    }
    if (INFRASTRUCTURE_LIKE.test(segment)) {
      throw new ToolIdError(
        `segment "${segment}" in "${id}" looks like infrastructure; tool IDs never carry environment names`
      );
    }
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      throw new ToolIdError(
        `segment "${segment}" in "${id}" carries a vendor or protocol name; that belongs in a connector binding`
      );
    }
  }
  const verb = segments.at(-1);
  if (!VERBS.has(verb)) {
    throw new ToolIdError(`verb "${verb}" in "${id}" is not in the closed verb set`);
  }
  return {
    domain: segments[0],
    resource: segments.length >= 3 ? segments[1] : null,
    sub: segments.length === 4 ? segments[2] : null,
    verb,
  };
}

function snapshotSchema(schema) {
  const snapshot = Object.create(Object.getPrototypeOf(schema));
  const pending = [[schema, snapshot]];
  while (pending.length > 0) {
    const [source, target] = pending.pop();
    for (const [name, value] of Object.entries(source)) {
      let copy = value;
      if (Array.isArray(value)) {
        copy = Object.freeze(Array.from({ length: value.length }, (_, index) => value[index]));
      } else if (value !== null && typeof value === 'object') {
        copy = Object.create(Object.getPrototypeOf(value));
        pending.push([value, copy]);
      }
      Object.defineProperty(target, name, { value: copy, enumerable: true });
    }
    Object.freeze(target);
  }
  return snapshot;
}

export function toolFace(face = {}) {
  const { id, effect, connector, summary } = face;
  const issues = [];
  try {
    parseToolId(id);
  } catch (error) {
    issues.push(error.message);
  }
  if (!EFFECT_CLASSES.has(effect)) {
    issues.push(`effect must be one of ${[...EFFECT_CLASSES].join(', ')} (got ${JSON.stringify(effect)})`);
  }
  if (typeof connector !== 'string' || connector.length === 0) {
    issues.push('connector must be a non-empty string naming the binding that performs the tool');
  }
  if (typeof summary !== 'string' || summary.length === 0) {
    issues.push('summary must be a non-empty contract of intent');
  }
  const schemas = {};
  for (const name of ['inputSchema', 'outputSchema']) {
    if (!Object.hasOwn(face, name)) continue;
    const schema = face[name];
    const { ok, errors } = checkSchema(schema);
    if (!ok) {
      for (const { path, reason } of errors) issues.push(`${name}${path}: ${reason}`);
      continue;
    }
    schemas[name] = schema;
  }
  if (issues.length > 0) throw new FaceError(issues);
  for (const name of Object.keys(schemas)) schemas[name] = snapshotSchema(schemas[name]);
  return Object.freeze({ id, effect, connector, summary, ...schemas });
}

export function toolPack(faces = []) {
  if (!Array.isArray(faces)) {
    throw new FaceError('a tool pack takes a list of faces');
  }
  const byId = new Map();
  for (const face of faces) {
    // A pack refuses anything that is not a face, wherever it came from:
    // every entry is checked again, and frozen is not the same as valid.
    const checked = toolFace(face);
    if (byId.has(checked.id)) {
      throw new FaceError(`duplicate tool ID "${checked.id}": a pack holds one face per ID`);
    }
    byId.set(checked.id, checked);
  }
  const list = Object.freeze([...byId.values()]);
  return Object.freeze({
    faces: list,
    face: (id) => byId.get(id) ?? null,
    has: (id) => byId.has(id),
    ids: () => list.map((f) => f.id),
    inDomain: (domain) => list.filter((f) => f.id.split('.')[0] === domain),
    get size() { return byId.size; },
  });
}
