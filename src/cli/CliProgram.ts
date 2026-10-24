import { Command as Program, CommanderError } from '@commander-js/extra-typings';

import { AddtoCommand } from '#command/AddtoCommand.ts';
import { BackCommand } from '#command/BackCommand.ts';
import { CanvasCommand } from '#command/CanvasCommand.ts';
import type { Command } from '#command/Command.ts';
import type { CommandExecutor } from '#command/CommandExecutor.ts';
import { CreateCommand } from '#command/CreateCommand.ts';
import { DeleteCommand } from '#command/DeleteCommand.ts';
import { FrontCommand } from '#command/FrontCommand.ts';
import { GroupCommand } from '#command/GroupCommand.ts';
import { HelpCommand } from '#command/HelpCommand.ts';
import { InitCommand } from '#command/InitCommand.ts';
import { MoveCommand } from '#command/MoveCommand.ts';
import { ReadCommand } from '#command/ReadCommand.ts';
import { RedoCommand } from '#command/RedoCommand.ts';
import { ResizeCommand } from '#command/ResizeCommand.ts';
import { SaveCommand } from '#command/SaveCommand.ts';
import { ScaleCommand } from '#command/ScaleCommand.ts';
import { SetCommand } from '#command/SetCommand.ts';
import { ShowCommand } from '#command/ShowCommand.ts';
import { TreeCommand } from '#command/TreeCommand.ts';
import { UndoCommand } from '#command/UndoCommand.ts';
import { UngroupCommand } from '#command/UngroupCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { ShapeFactory } from '#domain/ShapeFactory.ts';

/** Client of the Command pattern: parses one input line into a command object and hands it to the executor. */
export class CliProgram {
  /** A word is a double-quoted run without its quotes, or a run of non-spaces. */
  // ponytail: no escapes, so quoted text cannot contain a double quote. Add \" handling if text needs one.
  static readonly #word = /"([^"]*)"|(\S+)/g;
  static readonly #number = (value: string): Decimal => Decimal.parse(value);
  readonly #workspace: Workspace;
  readonly #executor: CommandExecutor;
  readonly #program: Program;
  /** Set by the action of whichever command the parse matched. */
  #pending: Command | null = null;

  constructor(workspace: Workspace, executor: CommandExecutor) {
    this.#workspace = workspace;
    this.#executor = executor;
    this.#program = this.#define();
  }

  /** Runs one line and returns its feedback. Bad syntax and refused edits throw EditorError. */
  run(line: string): string[] {
    const words = line
      .matchAll(CliProgram.#word)
      .map(([, quoted, plain]) => quoted ?? plain ?? '')
      .toArray();
    if (words.length === 0) return [];
    try {
      this.#program.parse(words, { from: 'user' });
    } catch (error) {
      if (!(error instanceof CommanderError)) throw error;
      // "error: unknown command 'mvoe'\n(Did you mean move?)" becomes one line without the prefix.
      throw new EditorError(error.message.replace(/^error: /, '').replaceAll('\n', ' '));
    }
    const command = this.#pending;
    this.#pending = null;
    return command === null ? [] : this.#executor.execute(command);
  }

  /** readline completer: command names for the first word, shape ids after it. */
  complete(line: string): [string[], string] {
    const word = line.split(' ').at(-1) ?? '';
    const candidates = line.includes(' ')
      ? this.#workspace.ids()
      : this.#program.commands.map((command) => command.name());
    return [candidates.filter((candidate) => candidate.startsWith(word)), word];
  }

  // 待重构: dispatch point 1 of 2 (spec 2.1), command name to command class.
  // A new verb means editing this method; the plugin phase can replace it with a command registry.
  #define(): Program {
    const workspace = this.#workspace;
    const program = new Program()
      .name('svg-editor')
      .exitOverride()
      .helpOption(false)
      .helpCommand(false)
      .configureHelp({ commandUsage: () => '<command> [arguments]' })
      .configureOutput({ writeOut: () => {}, writeErr: () => {} });
    program
      .command('init')
      .description('new empty canvas, 800x600 by default')
      .argument('[w]', 'width', CliProgram.#number)
      .argument('[h]', 'height', CliProgram.#number)
      .action((width, height) => this.#queue(new InitCommand(workspace, width, height)));
    program
      .command('read')
      .description('open an .svg file as the document')
      .argument('<file>')
      .action((path) => this.#queue(new ReadCommand(workspace, path)));
    program
      .command('save')
      .description('save to a file (default: last read or saved)')
      .argument('[file]')
      .action((path) => this.#queue(new SaveCommand(workspace, path)));
    program
      .command('canvas')
      .description('show the canvas size, or change it')
      .argument('[w]', 'width', CliProgram.#number)
      .argument('[h]', 'height', CliProgram.#number)
      .action((width, height) =>
        this.#queue(
          width === undefined
            ? new CanvasCommand(workspace)
            : new ResizeCommand(workspace, width, height),
        ),
      );
    program
      .command('create')
      .description('new shape, see shape types below')
      .argument('<type>')
      .argument('<id>')
      .argument('[params...]')
      .action((type, id, params) => this.#queue(this.#create(type, id, params)));
    program
      .command('delete')
      .description('delete a shape and everything inside it')
      .argument('<id>')
      .action((id) => this.#queue(new DeleteCommand(workspace, id)));
    program
      .command('move')
      .description('move by an offset')
      .argument('<id>')
      .argument('<dx>', 'x offset', CliProgram.#number)
      .argument('<dy>', 'y offset', CliProgram.#number)
      .action((id, dx, dy) => this.#queue(new MoveCommand(workspace, id, dx, dy)));
    program
      .command('scale')
      .description('multiply position and size by factor > 0')
      .argument('<id>')
      .argument('<factor>', 'factor', CliProgram.#number)
      .action((id, factor) => this.#queue(new ScaleCommand(workspace, id, factor)));
    program
      .command('set')
      .description('set a style or geometry attribute, or text')
      .argument('<id>')
      .argument('<attr>')
      .argument('<value>')
      .action((id, name, value) => this.#queue(new SetCommand(workspace, id, name, value)));
    program
      .command('group')
      .description('put shapes into a new container')
      .argument('<gid>')
      .argument('<ids...>')
      .action((id, memberIds) => this.#queue(new GroupCommand(workspace, id, memberIds)));
    program
      .command('ungroup')
      .description('dissolve a container into its parent')
      .argument('<gid>')
      .action((id) => this.#queue(new UngroupCommand(workspace, id)));
    program
      .command('addto')
      .description('move a shape to the end of a container')
      .argument('<gid>')
      .argument('<id>')
      .action((groupId, id) => this.#queue(new AddtoCommand(workspace, groupId, id)));
    program
      .command('front')
      .description('paint above its siblings')
      .argument('<id>')
      .action((id) => this.#queue(new FrontCommand(workspace, id)));
    program
      .command('back')
      .description('paint below its siblings')
      .argument('<id>')
      .action((id) => this.#queue(new BackCommand(workspace, id)));
    program
      .command('tree')
      .description('structure tree of the document or one shape')
      .argument('[id]')
      .action((id) => this.#queue(new TreeCommand(workspace, id)));
    program
      .command('show')
      .description('all attributes of one shape')
      .argument('<id>')
      .action((id) => this.#queue(new ShowCommand(workspace, id)));
    program
      .command('help')
      .description('show this list')
      .action(() => this.#queue(new HelpCommand(this.#help())));
    program
      .command('undo')
      .description('undo the last edit')
      .action(() => this.#queue(new UndoCommand(workspace, this.#executor)));
    program
      .command('redo')
      .description('redo the last undone edit')
      .action(() => this.#queue(new RedoCommand(workspace, this.#executor)));
    // Values such as "-hi" are text here, never options.
    for (const command of program.commands) command.allowUnknownOption();
    return program;
  }

  #queue(command: Command): void {
    this.#pending = command;
  }

  /** A trailing `in <containerId>` names the container; "in" anywhere else is an ordinary word. */
  #create(type: string, id: string, params: string[]): CreateCommand {
    if (params.at(-2) !== 'in') return new CreateCommand(this.#workspace, type, id, params);
    return new CreateCommand(this.#workspace, type, id, params.slice(0, -2), params.at(-1));
  }

  #help(): string[] {
    return [
      ...this.#program.helpInformation().trimEnd().split('\n'),
      '',
      'Shape types:',
      ...new ShapeFactory().usages().map((usage) => `  ${usage}`),
      '',
      'Quote text that has spaces: "My Diagram". Lines starting with # are comments.',
      'Ctrl+C or Ctrl+D quits.',
    ];
  }
}
