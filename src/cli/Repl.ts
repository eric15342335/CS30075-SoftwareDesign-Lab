import { createInterface } from 'node:readline';
import { styleText } from 'node:util';

import type { CliProgram } from '#cli/CliProgram.ts';
import { EditorError } from '#domain/EditorError.ts';

type Output = NodeJS.WritableStream & { readonly isTTY?: boolean };

/**
 * Repl is the read-eval-print loop. On a terminal, it shows a prompt and completes words with Tab.
 * When it reads a script through a pipe, it echoes every line, so the output looks like the
 * transcripts in the spec.
 */
export class Repl {
  static readonly #banner = "svg-editor 0.1 — type 'help' for commands";
  /** Matches blank lines and # comments. The loop echoes them but never runs them. */
  static readonly #quiet = /^\s*(?:#|$)/;
  readonly #program: CliProgram;
  readonly #input: NodeJS.ReadableStream;
  readonly #output: Output;

  constructor(program: CliProgram, input: NodeJS.ReadableStream, output: Output) {
    this.#program = program;
    this.#input = input;
    this.#output = output;
  }

  /** Starts the loop. The promise resolves when the input ends with EOF, Ctrl+D or Ctrl+C. */
  async start(): Promise<void> {
    const terminal = this.#output.isTTY === true;
    const lines = createInterface({
      input: this.#input,
      output: this.#output,
      terminal,
      prompt: 'svg> ',
      completer: (line: string) => this.#program.complete(line),
    });
    let open = true;
    lines.on('close', () => {
      open = false;
    });
    this.#print(Repl.#banner, '');
    if (terminal) lines.prompt();
    for await (const line of lines) {
      const quiet = Repl.#quiet.test(line);
      if (!terminal) this.#print(quiet ? line : `svg> ${line}`);
      if (!quiet) this.#print(...this.#evaluate(line));
      // Lines that were pasted before Ctrl+C still run. However, the loop must not show the
      // prompt again after the interface has closed.
      if (terminal && open) lines.prompt();
    }
  }

  #evaluate(line: string): string[] {
    try {
      return this.#program.run(line);
    } catch (error) {
      // Spec 2 says that every error is one line that starts with "error:". A bug also gets
      // such a line, and the session goes on.
      const message = error instanceof EditorError ? error.message : `internal: ${String(error)}`;
      return [styleText('red', `error: ${message}`, { stream: this.#output })];
    }
  }

  #print(...lines: string[]): void {
    for (const line of lines) this.#output.write(`${line}\n`);
  }
}
