// Drosera cookbook: recipes that compose published faces and skills, with
// their references resolved at validation, not discovered missing at runtime.

const ID = /^[a-z][a-z0-9-]*$/;

export class RecipeError extends Error {
  constructor(issues) {
    super(Array.isArray(issues) ? `invalid recipe: ${issues.join('; ')}` : issues);
    this.name = 'RecipeError';
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

function validateStep(step, index) {
  const issues = [];
  const hasTool = step && Object.prototype.hasOwnProperty.call(step, 'tool');
  const hasSkill = step && Object.prototype.hasOwnProperty.call(step, 'skill');
  if (hasTool && hasSkill) {
    issues.push(`step ${index} is both a tool step and a skill step; steps are one kind each`);
  }
  if (!hasTool && !hasSkill) {
    issues.push(`step ${index} must be a tool step { tool } or a skill step { skill }`);
  }
  if (hasTool && (typeof step.tool !== 'string' || step.tool.length === 0)) {
    issues.push(`step ${index} tool must be a non-empty tool ID`);
  }
  if (hasSkill && (typeof step.skill !== 'string' || step.skill.length === 0)) {
    issues.push(`step ${index} skill must be a non-empty skill name`);
  }
  if (step?.note !== undefined && (typeof step.note !== 'string' || step.note.length === 0)) {
    issues.push(`step ${index} note must be a non-empty string when present`);
  }
  return issues;
}

export function recipe({ id, objective, steps } = {}) {
  const issues = [];
  if (typeof id !== 'string' || !ID.test(id)) {
    issues.push('id must be kebab-case: lowercase letters, digits, or hyphens, starting with a letter');
  }
  if (typeof objective !== 'string' || objective.length === 0) {
    issues.push('objective must be a non-empty statement of what the recipe accomplishes');
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    issues.push('steps must be a list with at least one step');
  }
  if (Array.isArray(steps)) {
    steps.forEach((step, index) => issues.push(...validateStep(step, index)));
  }
  if (issues.length > 0) throw new RecipeError(issues);
  return Object.freeze({
    id,
    objective,
    steps: Object.freeze(
      steps.map((step) =>
        Object.freeze({
          ...(step.tool !== undefined ? { tool: step.tool } : { skill: step.skill }),
          ...(step.note !== undefined ? { note: step.note } : {}),
        })
      )
    ),
  });
}

export function cookbook(recipes = []) {
  if (!Array.isArray(recipes)) {
    throw new RecipeError('a cookbook takes a list of recipes');
  }
  const byId = new Map();
  for (const item of recipes) {
    const checked = item && Object.isFrozen(item) ? item : recipe(item);
    if (byId.has(checked.id)) {
      throw new RecipeError(`duplicate recipe id "${checked.id}": a cookbook holds one recipe per id`);
    }
    byId.set(checked.id, checked);
  }
  const list = Object.freeze([...byId.values()]);
  return Object.freeze({
    recipes: list,
    recipe: (id) => byId.get(id) ?? null,
    ids: () => list.map((r) => r.id),
    get size() { return byId.size; },
  });
}

export function checkRecipe(aRecipe, aToolPack, aSkillPack) {
  const errors = [];
  aRecipe.steps.forEach((step, index) => {
    if (step.tool !== undefined) {
      const face = aToolPack.face(step.tool);
      if (face === null) {
        errors.push(`step ${index} references tool "${step.tool}" that the pack does not hold`);
      }
    } else {
      const packaged = aSkillPack.skill(step.skill);
      if (packaged === null) {
        errors.push(`step ${index} references skill "${step.skill}" that the pack does not hold`);
      }
    }
  });
  return { ok: errors.length === 0, errors };
}
