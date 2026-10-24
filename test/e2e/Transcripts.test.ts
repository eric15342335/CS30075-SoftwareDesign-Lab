import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';

import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';

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

/** Pipes the input through a fresh CLI, as `bun run cli < script` would, and returns its output. */
async function replay(input: string): Promise<string> {
  let output = '';
  const sink = new Writable({
    write(chunk, _encoding, done) {
      output += String(chunk);
      done();
    },
  });
  const program = new CliProgram(new Workspace(), new CommandExecutor());
  await new Repl(program, Readable.from([input]), sink).start();
  return output;
}

// Copied verbatim from the spec: section 6 and section 6.1 version A, each cut before `save` until io lands.
test.each(['session', 'flowchart'])(
  'spec transcript %s.txt replays line for line',
  async (name) => {
    const transcript = await Bun.file(
      join(import.meta.dir, '..', 'fixtures', `${name}.txt`),
    ).text();
    expect(normalize(await replay(script(transcript)))).toEqual(normalize(transcript));
  },
);
