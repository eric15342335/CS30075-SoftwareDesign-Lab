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

/**
 * Returns what the user typed: the prompt lines without the prompt, plus the blank lines and
 * comment lines between them.
 */
function script(transcript: string): string {
  return transcript
    .split(/\r?\n/)
    .filter((line) => /^(?:svg> |#|\s*$)/.test(line))
    .map((line) => line.replace(/^svg> /, ''))
    .join('\n');
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

// The transcripts are copied word for word from the spec (section 6 and version A of section 6.1).
// Each one runs the real program, as `bun run cli < script` would, in a new directory that holds
// other.svg.
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

test('a syntax error prints one line on stdout and nothing on stderr', async () => {
  const child = Bun.spawn([process.execPath, main], {
    stdin: new Blob(['mvoe c1 1 2\n']),
    stderr: 'pipe',
  });
  const [output, errors] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(await child.exited).toBe(0);
  expect(normalize(output)).toEqual([
    'svg> mvoe c1 1 2',
    "error: unknown command 'mvoe' (Did you mean move?)",
  ]);
  expect(errors).toBe('');
});
