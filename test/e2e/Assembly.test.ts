import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { TranscriptRunner } from '#test/support/TranscriptRunner.ts';

const root = join(import.meta.dir, '..', '..');
const main = join(root, 'app', 'main.ts');
const transcripts = join(root, 'doc', 'transcript');
const empty = join(root, 'test', 'fixtures', 'configs', 'empty.config.json');
// This file mirrors the plugin list in app/main.ts. A commit that changes one changes both.
const assembly = join(root, 'test', 'fixtures', 'assembly.config.json');
const scratch = mkdtempSync(join(tmpdir(), 'svg-assembly-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
// One fixed working folder, outside the repository, that every run empties and refills.
const runner = new TranscriptRunner(join(scratch, 'cwd'));

/** Reads the script of a transcript. */
function input(name: string): string {
  return readFileSync(join(transcripts, `${name}.txt`), 'utf8');
}

/** Reads the recorded output of a transcript. For cli-1 and cli-2, it comes from the tag final. */
function baseline(name: string): { stdout: string; files: Record<string, string> } {
  const folder = join(transcripts, 'expected', name);
  const files = Object.fromEntries(
    readdirSync(folder)
      .toSorted()
      .map((file) => [file, readFileSync(join(folder, file), 'utf8')]),
  );
  return { stdout: readFileSync(join(transcripts, 'expected', `${name}.out`), 'utf8'), files };
}

test.each(['cli-1', 'cli-2'])(
  '%s without plugins prints and saves the same bytes as the tag final',
  async (name) => {
    const expected = baseline(name);
    expect(await runner.run(main, ['--no-plugins'], input(name))).toEqual(expected);
    expect(await runner.run(main, ['--config', empty], input(name))).toEqual(expected);
  },
);

test.each(['cli-1', 'cli-2'])(
  '%s prints and saves the same bytes in the code assembly and in the config assembly',
  async (name) => {
    const codeAssembly = await runner.run(main, [], input(name));
    expect(await runner.run(main, ['--config', assembly], input(name))).toEqual(codeAssembly);
  },
);

// cli-3 needs the stats and dir plugins. Its expected output was recorded once from the code
// assembly and checked by hand. The shipped config must give the same bytes.
const shipped = join(root, 'plugins.config.json');

test.each([[[]], [['--config', shipped]], [['--config', assembly]]])(
  'cli-3 (stats, dir and help) prints and saves the recorded bytes with %j',
  async (flags) => {
    expect(await runner.run(main, flags, input('cli-3'))).toEqual(baseline('cli-3'));
  },
);
