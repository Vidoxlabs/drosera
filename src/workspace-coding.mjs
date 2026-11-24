import { recipe } from './cookbook.mjs';
import { toolPack } from './pack.mjs';

const text = { type: 'string' };
const nonEmptyText = { type: 'string', minLength: 1 };
const line = { type: 'integer', minimum: 1 };

function face(id, effect, connector, summary, properties, required) {
  return {
    id,
    effect,
    connector,
    summary,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
  };
}

export const workspaceToolPack = toolPack([
  face('workspace.dir.list', 'read', 'workspace',
    'List directory entries inside the workspace.', { path: nonEmptyText }, []),
  face('workspace.file.read', 'read', 'workspace',
    'Read a file or an inclusive line range inside the workspace.',
    { path: nonEmptyText, startLine: line, endLine: line }, ['path']),
  face('workspace.text.search', 'read', 'workspace',
    'Find literal text inside the workspace.',
    { query: nonEmptyText, path: nonEmptyText }, ['query']),
  face('workspace.file.write', 'write', 'workspace',
    'Create or replace a file inside the workspace.',
    { path: nonEmptyText, content: text }, ['path', 'content']),
  face('workspace.file.update', 'write', 'workspace',
    'Replace one exact, unique text match inside a workspace file.',
    { path: nonEmptyText, oldText: nonEmptyText, newText: text }, ['path', 'oldText', 'newText']),
  face('workspace.shell.execute', 'write', 'workspace',
    'Run a bounded workspace command with explicit arguments.',
    { command: nonEmptyText, args: { type: 'array', items: text } }, ['command']),
  face('run.answer.create', 'read', 'run',
    'Return the final answer and finish the coding run.', { text }, ['text']),
]);

export const workspaceCodingRecipe = recipe({
  id: 'workspace-coding',
  objective: 'Inspect the workspace, make an approved edit, verify it, and return the final answer.',
  steps: [
    { tool: 'workspace.dir.list', note: 'Find the relevant directory.' },
    { tool: 'workspace.file.read', note: 'Inspect the relevant file.' },
    { tool: 'workspace.text.search', note: 'Find references to the behavior being changed.' },
    { tool: 'workspace.file.write', note: 'Use for an approved create or full replacement.' },
    { tool: 'workspace.file.update', note: 'Use for an approved targeted edit.' },
    { tool: 'workspace.shell.execute', note: 'Run the approved verification command.' },
    { tool: 'run.answer.create', note: 'Summarize the change and verification.' },
  ],
});
