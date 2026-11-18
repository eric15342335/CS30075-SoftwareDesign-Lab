import { Command } from '#command/Command.ts';
import type { TreeRenderer } from '#command/TreeRenderer.ts';
import type { Workspace } from '#command/Workspace.ts';

/** The `tree [id]` command. It forwards the request to the tree renderer. */
export class TreeCommand extends Command {
  readonly #workspace: Workspace;
  readonly #renderer: TreeRenderer;
  readonly #id: string | undefined;

  constructor(workspace: Workspace, renderer: TreeRenderer, id?: string) {
    super();
    this.#workspace = workspace;
    this.#renderer = renderer;
    this.#id = id;
  }

  override execute(): string[] {
    return this.#renderer.render(this.#workspace.document(), this.#id);
  }
}
