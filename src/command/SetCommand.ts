import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { AttributeMemento } from '#domain/AttributeMemento.ts';

export class SetCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #id: string;
  readonly #name: string;
  readonly #value: string;
  #memento: AttributeMemento | null = null;

  constructor(workspace: Workspace, id: string, name: string, value: string) {
    super();
    this.#workspace = workspace;
    this.#id = id;
    this.#name = name;
    this.#value = value;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    this.#memento = document.set(this.#id, this.#name, this.#value);
    return [this.#feedback(this.#value)];
  }

  override undo(): string[] {
    this.#memento?.restore();
    return [this.#feedback(this.#memento?.old)];
  }

  #feedback(value: string | undefined): string {
    const label = this.#workspace.document().find(this.#id).label();
    const change = value === undefined ? `${this.#name} removed` : `${this.#name}="${value}"`;
    return `${label} updated: ${change}`;
  }
}
