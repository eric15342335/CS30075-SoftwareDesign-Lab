import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Decimal } from '#domain/Decimal.ts';
import type { Memento } from '#domain/Memento.ts';

export class MoveCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #id: string;
  readonly #dx: Decimal;
  readonly #dy: Decimal;
  #memento: Memento | null = null;

  constructor(workspace: Workspace, id: string, dx: Decimal, dy: Decimal) {
    super();
    this.#workspace = workspace;
    this.#id = id;
    this.#dx = dx;
    this.#dy = dy;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    this.#memento = document.move(this.#id, this.#dx, this.#dy);
    const shape = document.find(this.#id);
    return [`${shape.label()} moved ${shape.movedPhrase(this.#dx, this.#dy)}`];
  }

  override undo(): string[] {
    this.#memento?.restore();
    const shape = this.#workspace.document().find(this.#id);
    const phrase = shape.movedPhrase(this.#dx.negated(), this.#dy.negated());
    return [`${shape.label()} moved back ${phrase}`];
  }
}
