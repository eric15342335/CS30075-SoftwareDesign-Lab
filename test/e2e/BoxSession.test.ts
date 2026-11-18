import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import BoxPlugin from '@svgframe/plugin-shape-box';

import { EditorError } from '#domain/EditorError.ts';
import { PluginHarness } from '#test/support/PluginHarness.ts';

// Version B of spec section 6.1, copied word for word. It runs with the box plugin and nothing
// else, so labels that later plugins add to tree cannot change it.
const root = join(import.meta.dir, '..', '..');
const fixtures = join(root, 'test', 'fixtures');
const transcript = readFileSync(join(fixtures, 'flowchart-box.txt'), 'utf8');
const saved = readFileSync(join(fixtures, 'flowchart-box.svg'), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'svg-box-session-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Returns what the user typed: the prompt lines without the prompt, and the comment lines. */
function script(text: string): string[] {
  return text
    .split(/\r?\n/)
    .filter((line) => /^(?:svg> |#)/.test(line))
    .map((line) => line.replace(/^svg> /, ''));
}

/**
 * Returns the lines to compare. It drops the shell line, the banner and blank lines, and it
 * collapses runs of whitespace (spec gap 1).
 */
function normalize(text: string): string[] {
  return stripVTControlCharacters(text)
    .split(/\r?\n/)
    .map((line) => line.trim().replaceAll(/\s+/g, ' '))
    .filter((line) => line !== '' && !line.startsWith('$ ') && !line.startsWith('svg-editor '));
}

/** Runs one input line in the harness and returns what the REPL would print for it. */
function replay(harness: PluginHarness, line: string): string[] {
  if (line.startsWith('#')) return [line];
  try {
    return [`svg> ${line}`, ...harness.run(line)];
  } catch (error) {
    if (!(error instanceof EditorError)) throw error;
    return [`svg> ${line}`, `error: ${error.message}`];
  }
}

test('version B of spec 6.1 replays with the box plugin built in code', () => {
  const folder = mkdtempSync(join(scratch, 'code-'));
  const home = process.cwd();
  // save writes relative to the working folder, so the session runs inside its own folder.
  process.chdir(folder);
  try {
    const harness = new PluginHarness([new BoxPlugin()]);
    const output = script(transcript).flatMap((line) => replay(harness, line));
    expect(normalize(output.join('\n'))).toEqual(normalize(transcript));
    expect(readFileSync('flowchart-box.svg', 'utf8')).toBe(saved);
  } finally {
    process.chdir(home);
  }
});

test('version B of spec 6.1 replays with a config that loads only the box plugin', async () => {
  const folder = mkdtempSync(join(scratch, 'config-'));
  const config = join(fixtures, 'configs', 'box.config.json');
  const child = Bun.spawn([process.execPath, join(root, 'app', 'main.ts'), '--config', config], {
    cwd: folder,
    env: { ...process.env, NO_COLOR: '1' },
    stdin: new Blob([script(transcript).join('\n')]),
  });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  expect(normalize(output)).toEqual(normalize(transcript));
  expect(readFileSync(join(folder, 'flowchart-box.svg'), 'utf8')).toBe(saved);
});
