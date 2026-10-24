import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Memento } from '#domain/Memento.ts';

export class AddtoCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #groupId: string;
  readonly #id: string;
  #memento: Memento | null = null;

  constructor(workspace: Workspace, groupId: string, id: string) {
    super();
    this.#workspace = workspace;
    this.#groupId = groupId;
    this.#id = id;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    this.#memento = document.addto(this.#groupId, this.#id);
    return [this.#feedback('moved into')];
  }

  override undo(): string[] {
    this.#memento?.restore();
    return [this.#feedback('moved back into')];
  }

  #feedback(verb: string): string {
    const shape = this.#workspace.document().find(this.#id);
    return `${shape.label()} ${verb} ${shape.parent?.label()}`;
  }
}
