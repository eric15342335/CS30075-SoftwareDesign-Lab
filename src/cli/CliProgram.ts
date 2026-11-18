import { Command as Program, CommanderError } from '@commander-js/extra-typings';

import type { Command } from '#command/Command.ts';
import type { CommandContext } from '#command/CommandContext.ts';
import type { CommandExecutor } from '#command/CommandExecutor.ts';
import type { Extensions } from '#command/Extensions.ts';
import type { Workspace } from '#command/Workspace.ts';
import { EditorError } from '#domain/EditorError.ts';

/**
 * CliProgram is the client in the Command pattern. It parses one input line into a command object
 * and hands the command to the executor. It is also an adapter: it turns the registered command
 * providers into commander commands, so that providers never see commander.
 */
export class CliProgram {
  /**
   * A word is either the text between two double quotes, without the quotes, or a run of
   * characters that are not spaces.
   */
  // ponytail: This pattern has no escapes, so quoted text cannot contain a double quote.
  // Add support for \" if the text ever needs one.
  static readonly #word = /"([^"]*)"|(\S+)/g;
  readonly #workspace: Workspace;
  readonly #executor: CommandExecutor;
  readonly #extensions: Extensions;
  readonly #program: Program;
  /** The action of the matched command stores the new command object here. */
  #pending: Command | null = null;

  constructor(workspace: Workspace, executor: CommandExecutor, extensions: Extensions) {
    this.#workspace = workspace;
    this.#executor = executor;
    this.#extensions = extensions;
    this.#program = this.#define();
  }

  /** Runs one line and returns its feedback. Bad syntax or a refused edit throws an EditorError. */
  run(line: string): string[] {
    const words = line
      .matchAll(CliProgram.#word)
      .map(([, quoted, plain]) => quoted ?? plain ?? '')
      .toArray();
    const [name] = words;
    if (name === undefined) return [];
    // The registry decides which commands exist, before commander looks at the words.
    if (this.#extensions.commands.get(name) === undefined) {
      throw new EditorError(`unknown command: ${name}`);
    }
    try {
      this.#program.parse(words, { from: 'user' });
    } catch (error) {
      if (!(error instanceof CommanderError)) throw error;
      // Commander's message "error: missing required argument 'dy'" becomes one line without the
      // "error: " prefix.
      throw new EditorError(error.message.replace(/^error: /, '').replaceAll('\n', ' '));
    }
    const command = this.#pending;
    this.#pending = null;
    return command === null ? [] : this.#executor.execute(command);
  }

  /**
   * Completes input for readline. It offers command names for the first word and shape ids for
   * the words after it.
   */
  complete(line: string): [string[], string] {
    const word = line.split(' ').at(-1) ?? '';
    const candidates = line.includes(' ')
      ? this.#workspace.ids()
      : this.#extensions.commands.values().map((provider) => provider.name);
    return [candidates.filter((candidate) => candidate.startsWith(word)), word];
  }

  /** Builds one commander command for each registered provider, in the order of registration. */
  #define(): Program {
    const program = new Program()
      .name('svg-editor')
      .exitOverride()
      .helpOption(false)
      .helpCommand(false)
      .configureHelp({ commandUsage: () => '<command> [arguments]' })
      .configureOutput({ writeOut: () => {}, writeErr: () => {} });
    const context: CommandContext = {
      workspace: this.#workspace,
      executor: this.#executor,
      help: () => this.#help(),
    };
    for (const provider of this.#extensions.commands.values()) {
      // Here, a value such as "-hi" is ordinary text. Commander never reads it as an option.
      const command = program
        .command(provider.name)
        .description(provider.description)
        .allowUnknownOption();
      if (provider.syntax !== '') command.arguments(provider.syntax);
      command.action(() => {
        this.#pending = provider.create(command.args, context);
      });
    }
    return program;
  }

  #help(): string[] {
    return [
      ...this.#program.helpInformation().trimEnd().split('\n'),
      '',
      'Shape types:',
      ...this.#extensions.catalog.usages().map((usage) => `  ${usage}`),
      '',
      'Quote text that has spaces: "My Diagram". Lines starting with # are comments.',
      'Ctrl+C or Ctrl+D quits.',
    ];
  }
}
