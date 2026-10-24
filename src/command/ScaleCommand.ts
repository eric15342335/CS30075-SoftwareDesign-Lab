import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Decimal } from '#domain/Decimal.ts';
import type { Memento } from '#domain/Memento.ts';

export class ScaleCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #id: string;
  readonly #factor: Decimal;
  #memento: Memento | null = null;

  constructor(workspace: Workspace, id: string, factor: Decimal) {
    super();
    this.#workspace = workspace;
    this.#id = id;
    this.#factor = factor;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    this.#memento = document.scale(this.#id, this.#factor);
    return [`${document.find(this.#id).label()} scaled by ${this.#factor.toString()}`];
  }

  override undo(): string[] {
    this.#memento?.restore();
    const label = this.#workspace.document().find(this.#id).label();
    return [`${label} scaled back by 1/${this.#factor.toString()}`];
  }
}
