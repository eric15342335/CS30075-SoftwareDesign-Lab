import type { Command } from '#command/Command.ts';
import type { CommandContext } from '#command/CommandContext.ts';
import type { CommandProvider } from '#command/CommandProvider.ts';

type Factory = (args: readonly string[], context: CommandContext) => Command;

/**
 * A command provider for one built-in verb. The built-in verbs form one table in BuiltinCommands,
 * so they do not need a class each. Plugin commands are separate provider classes.
 */
export class BuiltinCommandProvider implements CommandProvider {
  readonly name: string;
  readonly syntax: string;
  readonly description: string;
  readonly #factory: Factory;

  constructor(name: string, syntax: string, description: string, factory: Factory) {
    this.name = name;
    this.syntax = syntax;
    this.description = description;
    this.#factory = factory;
  }

  create(args: readonly string[], context: CommandContext): Command {
    return this.#factory(args, context);
  }
}
