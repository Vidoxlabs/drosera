// Drosera skills: packaged instructions. Text for a reader; no authority.

const NAME = /^[a-z][a-z0-9-]*$/;

export class SkillError extends Error {
  constructor(issues) {
    super(Array.isArray(issues) ? `invalid skill: ${issues.join('; ')}` : issues);
    this.name = 'SkillError';
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

function validate({ name, summary, instructions, tips } = {}) {
  const issues = [];
  if (typeof name !== 'string' || !NAME.test(name)) {
    issues.push('name must be kebab-case: lowercase letters, digits, or hyphens, starting with a letter');
  }
  if (typeof summary !== 'string' || summary.length === 0) {
    issues.push('summary must be a non-empty statement of what the skill accomplishes');
  }
  if (typeof instructions !== 'string' || instructions.length === 0) {
    issues.push('instructions must be non-empty text');
  }
  if (tips !== undefined) {
    if (!Array.isArray(tips) || tips.some((t) => typeof t !== 'string' || t.length === 0)) {
      issues.push('tips must be a list of non-empty strings when present');
    }
  }
  return issues;
}

export function skill(input) {
  const issues = validate(input);
  if (issues.length > 0) throw new SkillError(issues);
  return Object.freeze({
    name: input.name,
    summary: input.summary,
    instructions: input.instructions,
    ...(input.tips === undefined ? {} : { tips: Object.freeze([...input.tips]) }),
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
