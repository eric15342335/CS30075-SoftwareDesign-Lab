import { expect, test } from 'bun:test';
import { copyFileSync, readFileSync } from 'node:fs';

import { CliProcess } from '#test/support/CliProcess.ts';
import { repo } from '#test/support/Paths.ts';
import { SpecTranscript } from '#test/support/SpecTranscript.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

const cli = new CliProcess();

// The transcripts are copied word for word from the spec (section 6 and version A of section 6.1).
// Each one runs the real program, as `bun run cli --no-plugins < script` would, in a new directory
// that holds other.svg. Phase 1 text has no tree labels, so the plugins stay off.
test.each([
  ['session.txt', 'demo.svg'],
  ['flowchart.txt', 'flowchart.svg'],
])('the spec transcript %s replays line for line and saves %s', async (name, saved) => {
  using folder = new TempFolder();
  copyFileSync(repo.fixture('other.svg'), folder.file('other.svg'));
  const transcript = new SpecTranscript(readFileSync(repo.fixture(name), 'utf8'));
  const { stdout, code } = await cli.run(['--no-plugins'], transcript.input(), folder.path);
  expect(code).toBe(0);
  expect(new SpecTranscript(stdout).lines()).toEqual(transcript.lines());
  expect(readFileSync(folder.file(saved), 'utf8')).toBe(readFileSync(repo.fixture(saved), 'utf8'));
});

test('a syntax error prints one line on stdout and nothing on stderr', async () => {
  const { stdout, stderr, code } = await cli.run([], 'mvoe c1 1 2\n');
  expect(code).toBe(0);
  expect(new SpecTranscript(stdout).lines()).toEqual([
    'svg> mvoe c1 1 2',
    'error: unknown command: mvoe',
  ]);
  expect(stderr).toBe('');
});

test('--no-plugins starts the editor with the built-in extensions only', async () => {
  const [plugins, builtins] = await Promise.all([
    cli.run([], 'help\n'),
    cli.run(['--no-plugins'], 'help\n'),
  ]);
  expect(plugins.stdout).toContain('  stats ');
  expect(builtins.stdout).not.toContain('  stats ');
  expect(builtins.stdout).toContain('create g <id> [in <containerId>]');
});
