import { expect, test } from 'bun:test';
import { Readable, Writable } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';

import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';

/** A program whose `boom` line hits a bug, to see how the loop reports one. */
class BuggyProgram extends CliProgram {
  override run(line: string): string[] {
    if (line === 'boom') throw new TypeError('x is undefined');
    return super.run(line);
  }
}

/** Feeds chunks of input to a Repl and returns everything it wrote. */
async function replay(chunks: string[], terminal = false): Promise<string> {
  let text = '';
  const output = Object.assign(
    new Writable({
      write(chunk, _encoding, done) {
        text += String(chunk);
        done();
      },
    }),
    { isTTY: terminal },
  );
  const program = new BuggyProgram(new Workspace(), new CommandExecutor());
  await new Repl(program, Readable.from(chunks), output).start();
  return text;
}

test('a piped script is echoed like the spec transcripts', async () => {
  const script = ['init', '', '# a comment', 'create rect r1 0 0 1 1', 'move r9 1 1', 'boom', ''];
  expect(await replay([script.join('\n')])).toBe(
    [
      "svg-editor 0.1 — type 'help' for commands",
      '',
      'svg> init',
      'canvas 800x600 created',
      '',
      '# a comment',
      'svg> create rect r1 0 0 1 1',
      'rect#r1 created',
      'svg> move r9 1 1',
      'error: no such shape: r9',
      'svg> boom',
      'error: internal: TypeError: x is undefined',
      '',
    ].join('\n'),
  );
});

test('on a terminal it prompts, completes with Tab, paints errors red and quits on Ctrl+C', async () => {
  // Readline completes only on a Tab that ends a chunk (a lone keypress), so each key is its own chunk.
  const output = await replay(['ini', '\t', '\n', 'move r9 1 1\n', '\u0003'], true);
  expect(output).toContain('\u001B[31merror: no such shape: r9\u001B[39m');
  const screen = stripVTControlCharacters(output);
  expect(screen).toStartWith("svg-editor 0.1 — type 'help' for commands\n\nsvg> ");
  expect(screen).toContain('svg> init');
  expect(screen).toContain('canvas 800x600 created');
});
