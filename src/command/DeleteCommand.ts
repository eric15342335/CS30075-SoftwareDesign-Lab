import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

export class DeleteCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #id: string;
  #memento: Memento | null = null;

  constructor(workspace: Workspace, id: string) {
    super();
    this.#workspace = workspace;
    this.#id = id;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    const label = document.find(this.#id).label();
    this.#memento = document.delete(this.#id);
    return [`${label} deleted`];
  }

  override undo(): string[] {
    this.#memento?.restore();
    const shape = this.#workspace.document().find(this.#id);
    return [`${shape.label()} restored into ${shape.parent?.label()}`];
  }
}
