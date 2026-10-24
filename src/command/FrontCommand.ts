import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

export class FrontCommand extends EditCommand {
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
    this.#memento = document.front(this.#id);
    return [`${document.find(this.#id).label()} brought to front`];
  }

  override undo(): string[] {
    this.#memento?.restore();
    return [`${this.#workspace.document().find(this.#id).label()} z-order restored`];
  }
}
