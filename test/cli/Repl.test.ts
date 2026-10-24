import { expect, test } from 'bun:test';
import { PassThrough, Readable, Writable } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';

import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';

/** A program whose `boom` line hits a bug. The tests use it to see how the loop reports a bug. */
class BuggyProgram extends CliProgram {
  override run(line: string): string[] {
    if (line === 'boom') throw new TypeError('x is undefined');
    return super.run(line);
  }
}

/** An output stream that keeps everything written to it. */
function recorder(terminal: boolean) {
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
  return { output, text: () => text };
}

/** Feeds chunks of input to a Repl and returns everything that the Repl wrote. */
async function replay(chunks: string[], terminal = false): Promise<string> {
  const { output, text } = recorder(terminal);
  const program = new BuggyProgram(new Workspace(), new CommandExecutor());
  await new Repl(program, Readable.from(chunks), output).start();
  return text();
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
  // Readline completes only when a Tab ends a chunk, as a single keypress does. So the test
  // sends each key as its own chunk.
  const output = await replay(['ini', '\t', '\n', 'move r9 1 1\n', '\u0003', 'tree\n'], true);
  expect(output).toContain('\u001B[31merror: no such shape: r9\u001B[39m');
  const screen = stripVTControlCharacters(output);
  expect(screen).toStartWith("svg-editor 0.1 — type 'help' for commands\n\nsvg> ");
  expect(screen).toContain('svg> init');
  expect(screen).toContain('canvas 800x600 created');
  // The tree command that is typed after Ctrl+C never runs.
  expect(screen).not.toContain('(800x600)');
});

test('on a terminal the prompt comes back after each command, and the typed line is not echoed twice', async () => {
  // This input comes at human speed: it ends only after the Repl has answered the first line.
  const input = new PassThrough();
  const { output, text } = recorder(true);
  const program = new CliProgram(new Workspace(), new CommandExecutor());
  const session = new Repl(program, input, output).start();
  input.write('init\n');
  await new Promise((resolve) => setImmediate(resolve));
  input.end();
  await session;
  expect(stripVTControlCharacters(text())).toBe(
    "svg-editor 0.1 — type 'help' for commands\n\nsvg> init\r\ncanvas 800x600 created\nsvg> ",
  );
});
