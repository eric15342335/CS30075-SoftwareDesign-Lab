import { EditCommand } from '#command/EditCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { AttributeEdit } from '#domain/AttributeEdit.ts';

/**
 * The `set <id> <attr> <value>` command. It forwards the request to the document, which picks the
 * attribute handler. Redo runs execute() again, so the handler sees the current document.
 */
export class SetCommand extends EditCommand {
  readonly #workspace: Workspace;
  readonly #id: string;
  readonly #name: string;
  readonly #value: string;
  #edit: AttributeEdit | null = null;

  constructor(workspace: Workspace, id: string, name: string, value: string) {
    super();
    this.#workspace = workspace;
    this.#id = id;
    this.#name = name;
    this.#value = value;
  }

  override execute(): string[] {
    this.#edit = this.#workspace.document().set(this.#id, this.#name, this.#value);
    return this.#edit.feedback();
  }

  override undo(): string[] {
    this.#edit?.restore();
    return this.#edit?.undoFeedback() ?? [];
  }
}
