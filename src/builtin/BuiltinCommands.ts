import { BuiltinCommandProvider } from '#builtin/BuiltinCommandProvider.ts';
import { AddtoCommand } from '#command/AddtoCommand.ts';
import { BackCommand } from '#command/BackCommand.ts';
import { CanvasCommand } from '#command/CanvasCommand.ts';
import type { CommandProvider } from '#command/CommandProvider.ts';
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
import { TreeRenderer } from '#command/TreeRenderer.ts';
import { UndoCommand } from '#command/UndoCommand.ts';
import { UngroupCommand } from '#command/UngroupCommand.ts';
import { Decimal } from '#domain/Decimal.ts';
import type { Registry } from '#domain/Registry.ts';

/**
 * The 19 commands of Phase 1, in the order that `help` lists them. They register through the same
 * extension point as plugin commands. The CLI checks the number of words before create() runs, so
 * a required word is always there. The numbers are parsed from left to right, which keeps the
 * Phase 1 order of the error messages.
 */
export class BuiltinCommands {
  static readonly #providers: readonly CommandProvider[] = [
    new BuiltinCommandProvider(
      'init',
      '[w] [h]',
      'new empty canvas, 800x600 by default',
      ([w, h], { workspace }) => {
        const width = BuiltinCommands.#number(w);
        return new InitCommand(workspace, width, BuiltinCommands.#number(h));
      },
    ),
    new BuiltinCommandProvider(
      'read',
      '<file>',
      'open an .svg file as the document',
      ([path = ''], { workspace }) => new ReadCommand(workspace, path),
    ),
    new BuiltinCommandProvider(
      'save',
      '[file]',
      'save to a file (default: last read or saved)',
      ([path], { workspace }) => new SaveCommand(workspace, path),
    ),
    new BuiltinCommandProvider(
      'canvas',
      '[w] [h]',
      'show the canvas size, or change it',
      ([w, h], { workspace }) => {
        const width = BuiltinCommands.#number(w);
        const height = BuiltinCommands.#number(h);
        if (width === undefined) return new CanvasCommand(workspace);
        return new ResizeCommand(workspace, width, height);
      },
    ),
    new BuiltinCommandProvider(
      'create',
      '<type> <id> [params...]',
      'new shape, see shape types below',
      // A trailing `in <containerId>` names the container. Anywhere else, "in" is a plain word.
      ([type = '', id = '', ...params], { workspace }) =>
        params.at(-2) === 'in'
          ? new CreateCommand(workspace, type, id, params.slice(0, -2), params.at(-1))
          : new CreateCommand(workspace, type, id, params),
    ),
    new BuiltinCommandProvider(
      'delete',
      '<id>',
      'delete a shape and everything inside it',
      ([id = ''], { workspace }) => new DeleteCommand(workspace, id),
    ),
    new BuiltinCommandProvider(
      'move',
      '<id> <dx> <dy>',
      'move by an offset',
      ([id = '', dx = '', dy = ''], { workspace }) => {
        const x = Decimal.parse(dx);
        return new MoveCommand(workspace, id, x, Decimal.parse(dy));
      },
    ),
    new BuiltinCommandProvider(
      'scale',
      '<id> <factor>',
      'multiply position and size by factor > 0',
      ([id = '', factor = ''], { workspace }) =>
        new ScaleCommand(workspace, id, Decimal.parse(factor)),
    ),
    new BuiltinCommandProvider(
      'set',
      '<id> <attr> <value>',
      'set a style or geometry attribute, or text',
      ([id = '', name = '', value = ''], { workspace }) =>
        new SetCommand(workspace, id, name, value),
    ),
    new BuiltinCommandProvider(
      'group',
      '<gid> <ids...>',
      'put shapes into a new container',
      ([id = '', ...members], { workspace }) => new GroupCommand(workspace, id, members),
    ),
    new BuiltinCommandProvider(
      'ungroup',
      '<gid>',
      'dissolve a container into its parent',
      ([id = ''], { workspace }) => new UngroupCommand(workspace, id),
    ),
    new BuiltinCommandProvider(
      'addto',
      '<gid> <id>',
      'move a shape to the end of a container',
      ([groupId = '', id = ''], { workspace }) => new AddtoCommand(workspace, groupId, id),
    ),
    new BuiltinCommandProvider(
      'front',
      '<id>',
      'paint above its siblings',
      ([id = ''], { workspace }) => new FrontCommand(workspace, id),
    ),
    new BuiltinCommandProvider(
      'back',
      '<id>',
      'paint below its siblings',
      ([id = ''], { workspace }) => new BackCommand(workspace, id),
    ),
    new BuiltinCommandProvider(
      'tree',
      '[id]',
      'structure tree of the document or one shape',
      ([id], context) =>
        new TreeCommand(context.workspace, new TreeRenderer(context.decorators()), id),
    ),
    new BuiltinCommandProvider(
      'show',
      '<id>',
      'all attributes of one shape',
      ([id = ''], { workspace }) => new ShowCommand(workspace, id),
    ),
    new BuiltinCommandProvider(
      'help',
      '',
      'show this list',
      (_args, context) => new HelpCommand(context.help()),
    ),
    new BuiltinCommandProvider(
      'undo',
      '',
      'undo the last edit',
      (_args, { workspace, executor }) => new UndoCommand(workspace, executor),
    ),
    new BuiltinCommandProvider(
      'redo',
      '',
      'redo the last undone edit',
      (_args, { workspace, executor }) => new RedoCommand(workspace, executor),
    ),
  ];

  static #number(text: string | undefined): Decimal | undefined {
    return text === undefined ? undefined : Decimal.parse(text);
  }

  register(commands: Registry<CommandProvider>): void {
    for (const provider of BuiltinCommands.#providers) commands.add(provider);
  }
}
