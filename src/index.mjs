// Drosera: the tooling fabric. Faces, skills, hooks, cookbooks. The public
// face of the reference library.

export {
  EFFECT_CLASSES,
  ToolIdError,
  FaceError,
  parseToolId,
  toolFace,
  toolPack,
} from './pack.mjs';
export { SkillError, skill, skillPack } from './skills.mjs';
export { EVENTS, HookError, hook, hookPack, runHooks } from './hooks.mjs';
export { RecipeError, recipe, cookbook, checkRecipe } from './cookbook.mjs';

export const VERSION = '0.2.0';

export function about() {
  const lines = [
    `drosera ${VERSION}`,
    'the tooling fabric: faces, skills, hooks, cookbooks',
    '',
    'modules:',
    '  pack      tool faces under seed\'s neutral tool-id grammar',
    '  skills    packaged instructions: context, never authority',
    '  hooks     deterministic checks, fail closed, bound to run events',
    '  cookbook  recipes whose references resolve at validation',
    '',
    'effect classes: read, write, destructive, credential',
    'hook events: run-start, before-tool, after-tool, run-end',
    'the grammar is seed\'s; when the mirror disagrees, seed wins',
  ];
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(about());
}
