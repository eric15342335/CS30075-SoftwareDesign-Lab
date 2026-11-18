import type { Command } from '#command/Command.ts';
import type { CommandContext } from '#command/CommandContext.ts';

/**
 * Extension point 2. A command provider adds one command to the CLI. The kernel finds it by name
 * and never imports a concrete command class.
 */
export interface CommandProvider {
  /** The first word of the input line, such as "stats". */
  readonly name: string;
  /** The arguments in commander syntax, such as "<id> <dx> <dy>" or "[file]". It may be empty. */
  readonly syntax: string;
  /** The one-line text that `help` shows next to the command. */
  readonly description: string;
  /**
   * Returns a new command object. The arguments are the raw words after the name. The CLI has
   * already checked their number against the syntax, and a variadic argument is flattened into
   * the list.
   */
  create(args: readonly string[], context: CommandContext): Command;
}
