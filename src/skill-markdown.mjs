// Drosera skill documents: markdown text the caller already holds, read into the
// record `skill()` accepts. Ported from the predecessor skill validator's required
// sections and frontmatter fields. Text in, record out; nothing is opened or sent.

import { skill, SkillError } from './skills.mjs';

// The nine headings the predecessor validator required, in its order.
export const SKILL_HEADINGS = Object.freeze([
  'Summary',
  'When to Use (Triggers)',
  'Inputs',
  'Outputs',
  'Procedure / Steps',
  'Guardrails',
  'Examples',
  'Verification',
  'Sources / Evidence',
]);

// The record list each heading fills. Summary joins the description instead.
const LIST_OF = Object.freeze({
  'When to Use (Triggers)': 'triggers',
  'Inputs': 'inputs',
  'Outputs': 'outputs',
  'Procedure / Steps': 'procedure',
  'Guardrails': 'guardrails',
  'Examples': 'examples',
  'Verification': 'verification',
  'Sources / Evidence': 'sources',
});

const REQUIRED_KEYS = Object.freeze(['name', 'description']);
const OPTIONAL_KEYS = Object.freeze(['lifecycle', 'promotedBy', 'deprecatedReason']);

const KEY = /^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]+(.*))?$/;
const BLOCK_SCALAR = /^([|>])([+-]?)(?:\s+#.*)?$/;
const SINGLE = /^'((?:[^']|'')*)'(?:\s+#.*)?\s*$/;
const DOUBLE = /^"((?:[^"\\]|\\.)*)"(?:\s+#.*)?\s*$/;
const HEADING = /^(#{1,6})\s+(.+)$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const LIST_ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+(.*)$/;
const QUOTE = /^(?:\s*>\s?)+/;

const isBlank = (line) => line.trim() === '';

function splitFrontmatter(lines) {
  if (lines[0]?.trimEnd() !== '---') return null;
  const end = lines.findIndex((line, index) => index > 0 && line.trimEnd() === '---');
  return end === -1 ? null : { front: lines.slice(1, end), body: lines.slice(end + 1) };
}

// A block scalar: `|` keeps its line breaks, `>` joins lines with a space and keeps
// each blank line as a break. Every value is trimmed, so chomping changes nothing.
function blockText(kind, block) {
  const filled = block.filter((line) => !isBlank(line));
  if (filled.length === 0) return '';
  const indent = Math.min(...filled.map((line) => line.length - line.trimStart().length));
  const lines = block.map((line) => (isBlank(line) ? '' : line.slice(indent)));
  if (kind === '|') return lines.join('\n').trim();
  let text = '';
  let previousFilled = false;
  for (const line of lines) {
    if (line === '') { text += '\n'; previousFilled = false; continue; }
    text += previousFilled ? ` ${line}` : line;
    previousFilled = true;
  }
  return text.trim();
}

function unescapeDouble(body) {
  let ok = true;
  const text = body.replace(/\\(.)/g, (_, char) => {
    if (char === '\\' || char === '"') return char;
    ok = false;
    return char;
  });
  return ok ? text : null;
}

// The value of one top-level key: text, or null when the key holds a nested block or
// its value cannot be read. A value the reader refuses leaves an issue naming its line.
function readValue(raw, block, number, issues) {
  const text = raw.trim();
  const continued = block.some((line) => !isBlank(line));
  if (text === '' || text.startsWith('#')) return continued ? null : '';
  if (text.startsWith('|') || text.startsWith('>')) {
    const form = BLOCK_SCALAR.exec(text);
    if (form === null) {
      issues.push(`frontmatter line ${number} uses a block form this reader does not take; use |, |-, >, or >-`);
      return null;
    }
    return blockText(form[1], block);
  }
  if (continued) {
    issues.push(`frontmatter line ${number} continues its value on indented lines; use a | or > block`);
    return null;
  }
  if (text.startsWith("'")) {
    const single = SINGLE.exec(text);
    if (single) return single[1].replace(/''/g, "'").trim();
    issues.push(`frontmatter line ${number} has an unclosed quote`);
    return null;
  }
  if (text.startsWith('"')) {
    const double = DOUBLE.exec(text);
    if (double === null) {
      issues.push(`frontmatter line ${number} has an unclosed quote`);
      return null;
    }
    const value = unescapeDouble(double[1]);
    if (value === null) {
      issues.push(`frontmatter line ${number} uses an escape this reader does not take; only \\\\ and \\" are read`);
      return null;
    }
    return value.trim();
  }
  const comment = text.search(/\s#/);
  return (comment === -1 ? text : text.slice(0, comment)).trim();
}

// Top-level keys only. The indented lines under a key belong to it; a key whose
// value is a nested mapping or list is kept unread.
function readFrontmatter(lines, issues) {
  const keys = new Map();
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const number = index + 1;
    index += 1;
    if (isBlank(line) || /^\s*#/.test(line)) continue;
    const match = KEY.exec(line);
    if (match === null) {
      issues.push(`frontmatter line ${number} is not a top-level key: value`);
      continue;
    }
    const start = index;
    while (index < lines.length && (isBlank(lines[index]) || /^\s/.test(lines[index]))) index += 1;
    const value = readValue(match[2] ?? '', lines.slice(start, index), number, issues);
    if (keys.has(match[1])) issues.push(`frontmatter key "${match[1]}" appears more than once`);
    else keys.set(match[1], value);
  }
  return keys;
}

function closesFence(line, marker) {
  const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
  return close !== null && close[1][0] === marker[0] && close[1].length >= marker.length;
}

// Split the body at level one and two headings found outside a code fence.
function readSections(lines) {
  const sections = [];
  let current = null;
  let fence = null;
  for (const line of lines) {
    if (fence === null) {
      const heading = HEADING.exec(line);
      if (heading !== null && heading[1].length <= 2) {
        current = { title: heading[2].trim(), lines: [] };
        sections.push(current);
        continue;
      }
      const open = FENCE.exec(line);
      if (open !== null) fence = open[1];
    } else if (closesFence(line, fence)) {
      fence = null;
    }
    current?.lines.push(line);
  }
  return sections;
}

// The items of one section: each list item (at any depth), each paragraph, and each
// fenced code block. A deeper heading labels the items under it as "Title: text".
function readItems(lines) {
  const items = [];
  let label = null;
  let open = null;
  let code = null;
  let blank = false;
  const push = (text) => {
    if (!isBlank(text)) items.push(label === null ? text : `${label}: ${text}`);
  };
  const close = () => {
    if (open !== null) push(open.parts.join(' '));
    open = null;
  };
  for (const raw of lines) {
    if (code !== null) {
      if (closesFence(raw, code.marker)) {
        push(code.lines.join('\n'));
        code = null;
      } else {
        code.lines.push(raw);
      }
      continue;
    }
    const fence = FENCE.exec(raw);
    if (fence !== null) {
      close();
      code = { marker: fence[1], lines: [] };
      continue;
    }
    const heading = HEADING.exec(raw);
    if (heading !== null) {
      close();
      label = heading[2].trim();
      blank = false;
      continue;
    }
    const line = raw.replace(QUOTE, '');
    if (isBlank(line)) {
      blank = true;
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item !== null) {
      close();
      open = { list: true, parts: [item[1].trim()] };
    } else if (open !== null && (!blank || (open.list && /^\s/.test(line)))) {
      open.parts.push(line.trim());
    } else {
      close();
      open = { list: false, parts: [line.trim()] };
    }
    blank = false;
  }
  if (code !== null) push(code.lines.join('\n'));
  close();
  return items;
}

/**
 * Read a skill document the caller already holds into the record `skill()` accepts,
 * and check it with `skill()`. The frontmatter gives `name` and `description`; the
 * body gives each of SKILL_HEADINGS at level one or two, each with a non-empty body.
 * Summary and description become `summary`; the other eight headings become the
 * lists. `lifecycle`, `promotedBy`, and `deprecatedReason` are read from the
 * frontmatter when present, so the lifecycle stays `draft` unless the document states
 * one, and `skill()` checks whatever it states. Every refusal is a SkillError.
 */
export function skillFromMarkdown(text) {
  if (typeof text !== 'string') throw new SkillError('a skill document is markdown text');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const issues = [];
  const split = splitFrontmatter(lines);
  let keys = new Map();
  if (split === null) {
    issues.push('a skill document opens with a frontmatter block between --- lines');
  } else {
    keys = readFrontmatter(split.front, issues);
    for (const key of REQUIRED_KEYS) {
      const value = keys.get(key);
      if (typeof value !== 'string' || value === '') issues.push(`frontmatter must give ${key} as non-empty text`);
    }
    for (const key of OPTIONAL_KEYS) {
      const value = keys.get(key);
      if (keys.has(key) && (typeof value !== 'string' || value === '')) {
        issues.push(`frontmatter ${key} must be non-empty text when present`);
      }
    }
  }

  const bodies = new Map();
  const repeated = new Set();
  for (const section of readSections(split === null ? lines : split.body)) {
    if (!SKILL_HEADINGS.includes(section.title)) continue;
    if (bodies.has(section.title)) repeated.add(section.title);
    else bodies.set(section.title, readItems(section.lines));
  }
  for (const heading of repeated) issues.push(`heading "${heading}" appears more than once`);
  for (const heading of SKILL_HEADINGS) {
    if (!bodies.has(heading)) issues.push(`missing heading "${heading}"`);
    else if (bodies.get(heading).length === 0) issues.push(`heading "${heading}" has an empty body`);
  }
  if (issues.length > 0) throw new SkillError(issues);

  const input = {
    name: keys.get('name'),
    summary: [keys.get('description'), ...bodies.get('Summary')].join('\n\n'),
    ...Object.fromEntries(Object.entries(LIST_OF).map(([heading, field]) => [field, bodies.get(heading)])),
  };
  for (const key of OPTIONAL_KEYS) {
    if (keys.has(key)) input[key] = keys.get(key);
  }
  return skill(input);
}
