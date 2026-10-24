import { DocumentCommand } from '#command/DocumentCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Decimal } from '#domain/Decimal.ts';

/** `canvas <w> [h]`: changes the canvas size. Like the other document commands, it ends undo (spec 4.3). */
export class ResizeCommand extends DocumentCommand {
  readonly #workspace: Workspace;
  readonly #width: Decimal;
  readonly #height: Decimal | undefined;

  constructor(workspace: Workspace, width: Decimal, height?: Decimal) {
    super();
    this.#workspace = workspace;
    this.#width = width;
    this.#height = height;
  }

  override execute(): string[] {
    const { canvas } = this.#workspace.document();
    canvas.resize(this.#width, this.#height);
    return [`canvas resized to ${canvas.size()}`];
  }
}
