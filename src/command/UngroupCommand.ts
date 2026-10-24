import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

export class UngroupCommand extends EditCommand {
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
    this.#memento = document.ungroup(this.#id);
    return [`${label} ungrouped`];
  }

  override undo(): string[] {
    this.#memento?.restore();
    return [`${this.#workspace.document().find(this.#id).label()} regrouped`];
  }
}
