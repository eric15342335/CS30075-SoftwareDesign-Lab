import type { Command } from '#command/Command.ts';
import type { CommandProvider } from '#command/CommandProvider.ts';
import { HelpCommand } from '#command/HelpCommand.ts';

/** A test command provider. Its command returns the words that it got, joined by "|". */
export class EchoProvider implements CommandProvider {
  readonly name: string;
  readonly syntax = '<first> [rest...]';
  readonly description = 'repeat the words';

  constructor(name: string) {
    this.name = name;
  }

  create(args: readonly string[]): Command {
    return new HelpCommand([args.join('|')]);
  }
}
