import { Command } from '#command/Command.ts';
import type { Workspace } from '#command/Workspace.ts';

/** `show <id>`: one shape's parent and attributes. */
export class ShowCommand extends Command {
  readonly #workspace: Workspace;
  readonly #id: string;

  constructor(workspace: Workspace, id: string) {
    super();
    this.#workspace = workspace;
    this.#id = id;
  }

  override execute(): string[] {
    const shape = this.#workspace.document().find(this.#id);
    return [
      `${shape.label()}  parent=${shape.parent?.label()}`,
      ...shape.details().map((line) => `  ${line}`),
    ];
  }
}
