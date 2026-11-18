import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

/** CreateCommand creates a shape, optionally inside a container. Undo removes it again. */
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
    const shape = document.find(this.#id);
    const where =
      this.#containerId === undefined ? '' : ` in ${document.find(this.#containerId).label()}`;
    // A composite shape lists the elements that it made, such as (g#n1 + rect#n1-rect).
    const parts = shape
      .walk()
      .map((part) => part.elementLabel())
      .toArray();
    const note = parts.length > 1 ? ` (${parts.join(' + ')})` : '';
    return [`${shape.label()} created${where}${note}`];
  }

  override undo(): string[] {
    const label = this.#workspace.document().find(this.#id).label();
    this.#memento?.restore();
    return [`${label} removed`];
  }
}
