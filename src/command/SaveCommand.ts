import { DocumentCommand } from '#command/DocumentCommand.ts';
import type { Workspace } from '#command/Workspace.ts';

/** The `save [file]` command. Without a file name, it writes to the last file read or saved. */
export class SaveCommand extends DocumentCommand {
  readonly #workspace: Workspace;
  readonly #path: string | undefined;

  constructor(workspace: Workspace, path?: string) {
    super();
    this.#workspace = workspace;
    this.#path = path;
  }

  override execute(): string[] {
    const path = this.#workspace.save(this.#path);
    const count = this.#workspace.document().count();
    return [`saved to ${path} (${count} ${count === 1 ? 'element' : 'elements'})`];
  }
}
