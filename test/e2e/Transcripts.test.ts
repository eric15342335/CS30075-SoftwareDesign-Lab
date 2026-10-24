import { afterAll, expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const fixtures = join(import.meta.dir, '..', 'fixtures');
const main = join(import.meta.dir, '..', '..', 'src', 'main.ts');
const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** What the user typed: prompt lines without the prompt, plus the blank and comment lines between them. */
function script(transcript: string): string {
  return transcript
    .split(/\r?\n/)
    .filter((line) => /^(?:svg> |#|\s*$)/.test(line))
    .map((line) => line.replace(/^svg> /, ''))
    .join('\n');
}

/** Lines to compare: no shell line, banner or blank lines, and whitespace runs collapsed (spec gap 1). */
function normalize(text: string): string[] {
  return stripVTControlCharacters(text)
    .split(/\r?\n/)
    .map((line) => line.trim().replaceAll(/\s+/g, ' '))
    .filter((line) => line !== '' && !line.startsWith('$ ') && !line.startsWith('svg-editor '));
}

// The transcripts are copied verbatim from the spec (section 6 and section 6.1 version A).
// Each runs the real program, as `bun run cli < script` would, in a fresh directory holding other.svg.
test.each([
  ['session.txt', 'demo.svg'],
  ['flowchart.txt', 'flowchart.svg'],
])('spec transcript %s replays line for line and saves %s', async (name, saved) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-e2e-'));
  dirs.push(dir);
  copyFileSync(join(fixtures, 'other.svg'), join(dir, 'other.svg'));
  const transcript = readFileSync(join(fixtures, name), 'utf8');
  const child = Bun.spawn([process.execPath, main], {
    cwd: dir,
    stdin: new Blob([script(transcript)]),
  });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  expect(normalize(output)).toEqual(normalize(transcript));
  expect(readFileSync(join(dir, saved), 'utf8')).toBe(readFileSync(join(fixtures, saved), 'utf8'));
});
