import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { repo } from '#test/support/Paths.ts';
import { TempFolder } from '#test/support/TempFolder.ts';
import { TranscriptRunner } from '#test/support/TranscriptRunner.ts';

const transcripts = repo.transcripts;
const empty = repo.fixture('configs', 'empty.config.json');
// This file mirrors the plugin list in app/main.ts. A commit that changes one changes both.
const assembly = repo.fixture('assembly.config.json');
const shipped = repo.shippedConfig;

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
    using folder = new TempFolder();
    const runner = new TranscriptRunner(folder.path);
    const expected = baseline(name);
    expect(await runner.run(['--no-plugins'], input(name))).toEqual(expected);
    expect(await runner.run(['--config', empty], input(name))).toEqual(expected);
  },
);

test.each(['cli-1', 'cli-2'])(
  '%s prints and saves the same bytes in the code assembly and in the config assembly',
  async (name) => {
    using folder = new TempFolder();
    const runner = new TranscriptRunner(folder.path);
    const codeAssembly = await runner.run([], input(name));
    expect(await runner.run(['--config', assembly], input(name))).toEqual(codeAssembly);
    expect(await runner.run(['--config', shipped], input(name))).toEqual(codeAssembly);
  },
);

// cli-3 needs the stats and dir plugins. Its expected output was recorded once from the code
// assembly and checked by hand.
test('cli-3 (stats, dir and help) prints and saves the recorded bytes in every assembly', async () => {
  using folder = new TempFolder();
  const runner = new TranscriptRunner(folder.path);
  const expected = baseline('cli-3');
  expect(await runner.run([], input('cli-3'))).toEqual(expected);
  expect(await runner.run(['--config', assembly], input('cli-3'))).toEqual(expected);
  expect(await runner.run(['--config', shipped], input('cli-3'))).toEqual(expected);
});

// cli-4 is version B of spec 6.1. It uses box, and its tree rows get the labels of every shipped
// plugin. test/e2e/BoxSession.test.ts checks it against the spec text with box alone.
test('cli-4 (version B of spec 6.1) prints and saves the same bytes in every assembly', async () => {
  using folder = new TempFolder();
  const runner = new TranscriptRunner(folder.path);
  const session = input('cli-4');
  const codeAssembly = await runner.run([], session);
  expect(codeAssembly.stdout).toContain('    ├── g#n1 (box) *\n');
  expect(Object.keys(codeAssembly.files)).toEqual(['flowchart-box.svg']);
  expect(await runner.run(['--config', assembly], session)).toEqual(codeAssembly);
  expect(await runner.run(['--config', shipped], session)).toEqual(codeAssembly);
});
