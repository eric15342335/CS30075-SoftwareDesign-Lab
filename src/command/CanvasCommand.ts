import { Command } from '#command/Command.ts';
import type { Workspace } from '#command/Workspace.ts';

/** The `canvas` command without arguments. It shows the canvas size. */
export class CanvasCommand extends Command {
  readonly #workspace: Workspace;

  constructor(workspace: Workspace) {
    super();
    this.#workspace = workspace;
  }

  override execute(): string[] {
    return [`canvas ${this.#workspace.document().canvas.size()}`];
  }
}
