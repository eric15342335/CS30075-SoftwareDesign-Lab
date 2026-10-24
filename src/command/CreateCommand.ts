import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

export class CreateCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #type: string;
  readonly #id: string;
  readonly #args: readonly string[];
  readonly #containerId: string | undefined;
  #memento: Memento | null = null;

  constructor(
    workspace: Workspace,
    type: string,
    id: string,
    args: readonly string[],
    containerId?: string,
  ) {
    super();
    this.#workspace = workspace;
    this.#type = type;
    this.#id = id;
    this.#args = args;
    this.#containerId = containerId;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    this.#memento = document.create(this.#type, this.#id, this.#args, this.#containerId);
    const label = document.find(this.#id).label();
    if (this.#containerId === undefined) return [`${label} created`];
    return [`${label} created in ${document.find(this.#containerId).label()}`];
  }

  override undo(): string[] {
    const label = this.#workspace.document().find(this.#id).label();
    this.#memento?.restore();
    return [`${label} removed`];
  }
}
