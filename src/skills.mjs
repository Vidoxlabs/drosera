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

// The promotion path a skill record moves through, ported from the predecessor
// skill lifecycle. A draft reaches promoted only through review. Deprecated is terminal.
export const LIFECYCLE_STATES = Object.freeze(['intake', 'draft', 'review', 'promoted', 'deprecated']);

const TRANSITIONS = Object.freeze({
  intake: Object.freeze(['draft', 'deprecated']),
  draft: Object.freeze(['review', 'deprecated']),
  review: Object.freeze(['promoted', 'draft', 'deprecated']),
  promoted: Object.freeze(['deprecated']),
  deprecated: Object.freeze([]),
});

// States before promotion carry neither a promoter nor a deprecation reason.
const UNPROMOTED = Object.freeze(['intake', 'draft', 'review']);

// Lists every skill carries beyond its procedure, guardrails, and verification. Ported
// from the predecessor skill validator's required sections; each is non-empty text.
export const SECTION_LISTS = Object.freeze(['triggers', 'inputs', 'outputs', 'examples', 'sources']);

const SECTION_MEANING = Object.freeze({
  triggers: 'situations that call for the skill',
  inputs: 'what the reader needs before starting',
  outputs: 'what following the skill produces',
  examples: 'worked examples',
  sources: 'evidence the skill rests on',
});

const textList = (value) => Array.isArray(value) && value.length > 0
  && value.every((item) => typeof item === 'string' && item.length > 0);

const article = (word) => (/^[aeiou]/.test(word) ? 'an' : 'a');

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
  for (const field of SECTION_LISTS) {
    if (!textList(input?.[field])) issues.push(`${field} must be a non-empty list of ${SECTION_MEANING[field]}, each non-empty text`);
  }
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
    if (UNPROMOTED.includes(lifecycle) && (promotedBy !== undefined || deprecatedReason !== undefined)) {
      issues.push(`${article(lifecycle)} ${lifecycle} skill carries neither promotedBy nor deprecatedReason`);
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
    ...Object.fromEntries(SECTION_LISTS.map((field) => [field, Object.freeze([...input[field]])])),
    ...(input.tips === undefined ? {} : { tips: Object.freeze([...input.tips]) }),
    lifecycle,
    ...(input.promotedBy === undefined ? {} : { promotedBy: input.promotedBy }),
    ...(input.deprecatedReason === undefined ? {} : { deprecatedReason: input.deprecatedReason }),
  });
}

/**
 * Move a skill record to another lifecycle state. Returns a new frozen record; the
 * given one is not changed. Intake → draft | deprecated; draft → review | deprecated;
 * review → promoted (naming `approver`) | draft | deprecated; promoted → deprecated.
 * Deprecation states its `reason`. A move to intake, draft, or review carries no
 * promoter. Deprecated does not transition, and a move to the same state is refused.
 */
export function transitionSkill(record, to, { approver, reason } = {}) {
  const current = skill(record);
  if (!TRANSITIONS[current.lifecycle].includes(to)) {
    throw new SkillError(`${article(current.lifecycle)} ${current.lifecycle} skill cannot move to ${JSON.stringify(to)}`);
  }
  const { promotedBy, deprecatedReason, lifecycle, ...rest } = current;
  if (UNPROMOTED.includes(to)) return skill({ ...rest, lifecycle: to });
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

/**
 * The notice a lifecycle move leaves for the `skill-promoted` and `skill-deprecated`
 * hook events. Both records are checked as skills and must name the same skill.
 * Review → promoted returns frozen `{ name, from, to, approver }`; any live state →
 * deprecated returns frozen `{ name, from, to, reason }`. Every other pair throws.
 * The notice is a plain record: nothing is written, read from the environment, or sent.
 * `transitionSkill` does not produce it; a caller that wants hooks builds it.
 */
export function lifecycleNotice(before, after) {
  const from = skill(before);
  const to = skill(after);
  if (from.name !== to.name) {
    throw new SkillError(`a lifecycle notice compares one skill: "${from.name}" is not the same skill as "${to.name}"`);
  }
  if (to.lifecycle === 'promoted' && from.lifecycle === 'review') {
    return Object.freeze({ name: to.name, from: 'review', to: 'promoted', approver: to.promotedBy });
  }
  if (to.lifecycle === 'deprecated' && from.lifecycle !== 'deprecated') {
    return Object.freeze({ name: to.name, from: from.lifecycle, to: 'deprecated', reason: to.deprecatedReason });
  }
  throw new SkillError(`${from.lifecycle} → ${to.lifecycle} is not a lifecycle notice; only review → promoted and a move to deprecated are`);
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
