import { Command } from '#command/Command.ts';
import type { CommandExecutor } from '#command/CommandExecutor.ts';
import type { Workspace } from '#command/Workspace.ts';

export class RedoCommand extends Command {
  readonly #workspace: Workspace;
  readonly #executor: CommandExecutor;

  constructor(workspace: Workspace, executor: CommandExecutor) {
    super();
    this.#workspace = workspace;
    this.#executor = executor;
  }

  override execute(): string[] {
    this.#workspace.document();
    return this.#executor.redo();
  }
}
