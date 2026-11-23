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
export {
  SkillError, VENDOR_NAMES, LIFECYCLE_STATES, SECTION_LISTS, lifecycleNotice, skill, skillPack, transitionSkill, skillCatalog,
} from './skills.mjs';
export { SKILL_HEADINGS, skillFromMarkdown } from './skill-markdown.mjs';
export { EVENTS, HookError, hook, hookPack, runHooks } from './hooks.mjs';
export { RecipeError, recipe, cookbook, checkRecipe } from './cookbook.mjs';

export const VERSION = '2.2.0';

export function about() {
  const lines = [
    `drosera ${VERSION}`,
    'the tooling fabric: faces, skills, hooks, cookbooks',
    '',
    'modules:',
    '  pack      tool faces under seed\'s neutral tool-id grammar',
    '  skills    procedure, guardrails, verification, triggers, inputs, outputs,',
    '            examples, sources: context, never authority;',
    '            lifecycle intake, draft, review, promoted, deprecated (terminal);',
    '            promotion only from review; public skill catalog;',
    '            skillFromMarkdown reads a skill document the caller holds',
    '  hooks     deterministic checks, fail closed, bound to run events and to',
    '            skill-promoted / skill-deprecated lifecycle notices',
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
