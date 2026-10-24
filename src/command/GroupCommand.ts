import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

export class GroupCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #id: string;
  readonly #memberIds: readonly string[];
  #memento: Memento | null = null;

  constructor(workspace: Workspace, id: string, memberIds: readonly string[]) {
    super();
    this.#workspace = workspace;
    this.#id = id;
    this.#memberIds = memberIds;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    this.#memento = document.group(this.#id, this.#memberIds);
    const group = document.find(this.#id);
    const count = group.children().length;
    return [`${group.label()} created with ${count} ${count === 1 ? 'child' : 'children'}`];
  }

  override undo(): string[] {
    const label = this.#workspace.document().find(this.#id).label();
    this.#memento?.restore();
    return [`${label} ungrouped`];
  }
}
