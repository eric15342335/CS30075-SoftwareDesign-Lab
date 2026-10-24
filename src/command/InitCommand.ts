import { DocumentCommand } from '#command/DocumentCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Decimal } from '#domain/Decimal.ts';

export class InitCommand extends DocumentCommand {
  readonly #workspace: Workspace;
  readonly #width: Decimal | undefined;
  readonly #height: Decimal | undefined;

  constructor(workspace: Workspace, width?: Decimal, height?: Decimal) {
    super();
    this.#workspace = workspace;
    this.#width = width;
    this.#height = height;
  }

  override execute(): string[] {
    const document = this.#workspace.init(this.#width, this.#height);
    return [`canvas ${document.canvas.size()} created`];
  }
}
