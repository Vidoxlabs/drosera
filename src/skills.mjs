// Drosera skills: packaged instructions. Text for a reader; no authority.

const NAME = /^[a-z][a-z0-9-]*$/;

// Vendor and product names never name a skill. This is the vendor half of the
// forbidden segments in seed's tool-id grammar (mirrored in pack.mjs); the
// protocol half stays allowed, because a skill about a protocol is a method.
export const VENDOR_NAMES = Object.freeze(new Set([
  'openai', 'anthropic', 'claude', 'chatgpt', 'gemini', 'grok', 'copilot', 'cursor',
]));

export class SkillError extends Error {
  constructor(issues) {
    super(Array.isArray(issues) ? `invalid skill: ${issues.join('; ')}` : issues);
    this.name = 'SkillError';
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

// The lifecycle a skill record moves through. Deprecated is terminal.
export const LIFECYCLE_STATES = Object.freeze(['draft', 'promoted', 'deprecated']);

const TRANSITIONS = Object.freeze({
  draft: Object.freeze(['promoted', 'deprecated']),
  promoted: Object.freeze(['deprecated']),
  deprecated: Object.freeze([]),
});

const textList = (value) => Array.isArray(value) && value.length > 0
  && value.every((item) => typeof item === 'string' && item.length > 0);

const nonEmpty = (value) => typeof value === 'string' && value.length > 0;

function validate(input = {}) {
  const {
    name, summary, instructions, procedure, guardrails, verification, tips,
    lifecycle = 'draft', promotedBy, deprecatedReason,
  } = input ?? {};
  const issues = [];
  if (typeof name !== 'string' || !NAME.test(name)) {
    issues.push('name must be kebab-case: lowercase letters, digits, or hyphens, starting with a letter');
  } else {
    const vendor = name.split('-').find((word) => VENDOR_NAMES.has(word));
    if (vendor !== undefined) {
      issues.push(`name word "${vendor}" is a vendor or product name; a skill name names the working method`);
    }
  }
  if (!nonEmpty(summary)) {
    issues.push('summary must be a non-empty statement of what the skill accomplishes');
  }
  if (instructions !== undefined && !nonEmpty(instructions)) {
    issues.push('instructions must be non-empty text when present');
  }
  if (!textList(procedure)) issues.push('procedure must be a non-empty list of steps, each non-empty text');
  if (!textList(guardrails)) issues.push('guardrails must be a non-empty list of limits, each non-empty text');
  if (!textList(verification)) issues.push('verification must be a non-empty list of checks, each non-empty text');
  if (tips !== undefined) {
    if (!Array.isArray(tips) || tips.some((t) => typeof t !== 'string' || t.length === 0)) {
      issues.push('tips must be a list of non-empty strings when present');
    }
  }
  if (!LIFECYCLE_STATES.includes(lifecycle)) {
    issues.push(`lifecycle must be one of ${LIFECYCLE_STATES.join(', ')}`);
  } else {
    if (lifecycle === 'promoted' && !nonEmpty(promotedBy)) issues.push('a promoted skill names who promoted it (promotedBy)');
    if (lifecycle === 'deprecated' && !nonEmpty(deprecatedReason)) issues.push('a deprecated skill states why (deprecatedReason)');
    if (lifecycle === 'draft' && (promotedBy !== undefined || deprecatedReason !== undefined)) {
      issues.push('a draft skill carries neither promotedBy nor deprecatedReason');
    }
    if (lifecycle === 'promoted' && deprecatedReason !== undefined) issues.push('a promoted skill carries no deprecatedReason');
  }
  return issues;
}

export function skill(input) {
  const issues = validate(input);
  if (issues.length > 0) throw new SkillError(issues);
  const lifecycle = input.lifecycle ?? 'draft';
  return Object.freeze({
    name: input.name,
    summary: input.summary,
    ...(input.instructions === undefined ? {} : { instructions: input.instructions }),
    procedure: Object.freeze([...input.procedure]),
    guardrails: Object.freeze([...input.guardrails]),
    verification: Object.freeze([...input.verification]),
    ...(input.tips === undefined ? {} : { tips: Object.freeze([...input.tips]) }),
    lifecycle,
    ...(input.promotedBy === undefined ? {} : { promotedBy: input.promotedBy }),
    ...(input.deprecatedReason === undefined ? {} : { deprecatedReason: input.deprecatedReason }),
  });
}

/**
 * Move a skill record to another lifecycle state. Returns a new frozen record; the
 * given one is not changed. Draft may be promoted (naming `approver`) or deprecated
 * (stating `reason`); promoted may be deprecated (stating `reason`). Deprecated does
 * not transition, and a move to the same state is refused.
 */
export function transitionSkill(record, to, { approver, reason } = {}) {
  const current = skill(record);
  if (!TRANSITIONS[current.lifecycle].includes(to)) {
    throw new SkillError(`a ${current.lifecycle} skill cannot move to ${JSON.stringify(to)}`);
  }
  const { promotedBy, deprecatedReason, lifecycle, ...rest } = current;
  if (to === 'promoted') {
    if (!nonEmpty(approver)) throw new SkillError('promotion names its approver');
    return skill({ ...rest, lifecycle: 'promoted', promotedBy: approver });
  }
  if (!nonEmpty(reason)) throw new SkillError('deprecation states its reason');
  return skill({
    ...rest,
    lifecycle: 'deprecated',
    ...(promotedBy === undefined ? {} : { promotedBy }),
    deprecatedReason: reason,
  });
}

export function skillPack(skills = []) {
  if (!Array.isArray(skills)) {
    throw new SkillError('a skill pack takes a list of skills');
  }
  const byName = new Map();
  for (const item of skills) {
    // Every entry is checked again; frozen is not the same as valid.
    const checked = skill(item);
    if (byName.has(checked.name)) {
      throw new SkillError(`duplicate skill name "${checked.name}": a pack holds one skill per name`);
    }
    byName.set(checked.name, checked);
  }
  const list = Object.freeze([...byName.values()]);
  return Object.freeze({
    skills: list,
    skill: (name) => byName.get(name) ?? null,
    has: (name) => byName.has(name),
    names: () => list.map((s) => s.name),
    get size() { return byName.size; },
  });
}

/** Build a read-only catalog snapshot from validated skills and their licenses. */
export function skillCatalog(entries = []) {
  if (!Array.isArray(entries)) throw new SkillError('a skill catalog takes a list of entries');

  const bySlug = new Map();
  for (const entry of entries) {
    const checked = skill(entry?.skill);
    const slug = checked.name;
    if (bySlug.has(slug)) throw new SkillError(`duplicate skill name "${slug}" in the catalog`);
    const isPublic = checked.lifecycle === 'promoted' && Object.hasOwn(entry, 'license') && entry.license === 'MIT';
    bySlug.set(slug, isPublic ? Object.freeze({ slug, license: 'MIT', skill: checked }) : null);
  }

  const listed = Object.freeze([...bySlug.values()].filter(item => item !== null));
  return Object.freeze({
    list: () => listed,
    read(slug) {
      const item = bySlug.get(slug);
      if (!item) throw new SkillError('the requested public skill is unavailable');
      return item;
    },
  });
}
