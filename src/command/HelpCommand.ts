import { Command } from '#command/Command.ts';

/** `help`: the client passes the text in, because only the client knows the command syntax. */
export class HelpCommand extends Command {
  readonly #lines: readonly string[];

  constructor(lines: readonly string[]) {
    super();
    this.#lines = lines;
  }

  override execute(): string[] {
    return [...this.#lines];
  }
}
