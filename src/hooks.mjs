// Drosera hooks: deterministic checks bound to run events. A check is a
// function, never prose, never a model call. Dispatch fails closed: a check
// that throws is a failed check, and the failure stands.

export const EVENTS = Object.freeze(
  new Set(['run-start', 'before-tool', 'after-tool', 'run-end'])
);

export class HookError extends Error {
  constructor(issues) {
    super(Array.isArray(issues) ? issues.join('; ') : issues);
    this.name = 'HookError';
  }
}

export function hook({ id, event, summary, check } = {}) {
  const issues = [];
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) {
    issues.push('id must be kebab-case: lowercase letters, digits, or hyphens, starting with a letter');
  }
  if (!EVENTS.has(event)) {
    issues.push(`event must be one of ${[...EVENTS].join(', ')} (got ${JSON.stringify(event)})`);
  }
  if (typeof summary !== 'string' || summary.length === 0) {
    issues.push('summary must be a non-empty statement of what the check guarantees');
  }
  if (typeof check !== 'function') {
    issues.push('check must be a function: hooks are deterministic code, not prose and never a model call');
  }
  if (issues.length > 0) throw new HookError(issues);
  return Object.freeze({ id, event, summary, check });
}

export function hookPack(hooks = []) {
  if (!Array.isArray(hooks)) {
    throw new HookError('a hook pack takes a list of hooks');
  }
  const byId = new Map();
  for (const item of hooks) {
    const checked = item && Object.isFrozen(item) && EVENTS.has(item.event) ? item : hook(item);
    if (byId.has(checked.id)) {
      throw new HookError(`duplicate hook id "${checked.id}": a pack holds one hook per id`);
    }
    byId.set(checked.id, checked);
  }
  const list = Object.freeze([...byId.values()]);
  const pack = Object.freeze({
    hooks: list,
    hook: (id) => byId.get(id) ?? null,
    hooksFor: (event) => list.filter((h) => h.event === event),
    ids: () => list.map((h) => h.id),
    get size() { return byId.size; },
  });
  return pack;
}

export function runHooks(pack, event, payload) {
  if (!EVENTS.has(event)) {
    throw new HookError(`unknown event ${JSON.stringify(event)}`);
  }
  const results = [];
  for (const h of pack.hooksFor(event)) {
    let passed = false;
    let detail = null;
    try {
      const verdict = h.check(payload);
      passed = Boolean(verdict && verdict.ok === true);
      detail = verdict?.message ?? (passed ? 'ok' : 'check returned ok !== true');
    } catch (error) {
      // Fail closed: a throw is a failed check. It never becomes a pass and
      // never skips the hook.
      passed = false;
      detail = `check threw: ${error.message}`;
    }
    results.push(Object.freeze({ id: h.id, passed, detail }));
  }
  return Object.freeze(results);
}
