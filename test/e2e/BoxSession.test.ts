import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import BoxPlugin from '@svgframe/plugin-shape-box';

import { EditorError } from '#domain/EditorError.ts';
import { CliProcess } from '#test/support/CliProcess.ts';
import { repo } from '#test/support/Paths.ts';
import { PluginHarness } from '#test/support/PluginHarness.ts';
import { SpecTranscript } from '#test/support/SpecTranscript.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

// Version B of spec section 6.1, copied word for word. It runs with the box plugin and nothing
// else, so labels that later plugins add to tree cannot change it.
const transcript = new SpecTranscript(readFileSync(repo.fixture('flowchart-box.txt'), 'utf8'));
const saved = readFileSync(repo.fixture('flowchart-box.svg'), 'utf8');

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
  using folder = new TempFolder();
  const home = process.cwd();
  // save writes relative to the working folder, so the session runs inside its own folder.
  process.chdir(folder.path);
  try {
    const harness = new PluginHarness([new BoxPlugin()]);
    const output = transcript
      .input()
      .split('\n')
      .flatMap((line) => replay(harness, line));
    expect(new SpecTranscript(output.join('\n')).lines()).toEqual(transcript.lines());
    expect(readFileSync('flowchart-box.svg', 'utf8')).toBe(saved);
  } finally {
    process.chdir(home);
  }
});

test('version B of spec 6.1 replays with a config that loads only the box plugin', async () => {
  using folder = new TempFolder();
  const config = repo.fixture('configs', 'box.config.json');
  const { stdout, code } = await new CliProcess().run(
    ['--config', config],
    transcript.input(),
    folder.path,
  );
  expect(code).toBe(0);
  expect(new SpecTranscript(stdout).lines()).toEqual(transcript.lines());
  expect(readFileSync(folder.file('flowchart-box.svg'), 'utf8')).toBe(saved);
});
