import { DocumentCommand } from '#command/DocumentCommand.ts';
import type { Workspace } from '#command/Workspace.ts';

/** The `read <file>` command. The file replaces the current document. */
export class ReadCommand extends DocumentCommand {
  readonly #workspace: Workspace;
  readonly #path: string;

  constructor(workspace: Workspace, path: string) {
    super();
    this.#workspace = workspace;
    this.#path = path;
  }

  override execute(): string[] {
    const warnings = this.#workspace.read(this.#path).map((warning) => `warning: ${warning}`);
    const count = this.#workspace.document().count();
    return [...warnings, `read ${this.#path} (${count} ${count === 1 ? 'element' : 'elements'})`];
  }
}
