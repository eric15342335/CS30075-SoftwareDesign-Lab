import { Command } from '#command/Command.ts';
import type { Workspace } from '#command/Workspace.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * The `tree [id]` command. It lists the shapes below the canvas, or below one shape, with their
 * summaries in a column.
 */
export class TreeCommand extends Command {
  readonly #workspace: Workspace;
  readonly #id: string | undefined;

  constructor(workspace: Workspace, id?: string) {
    super();
    this.#workspace = workspace;
    this.#id = id;
  }

  override execute(): string[] {
    const document = this.#workspace.document();
    const root = this.#id === undefined ? document.canvas : document.find(this.#id);
    const rows = this.#rows(root, '').toArray();
    // The examples in the spec align the summaries in different ways. Here, the summary column
    // starts 2 characters after the longest row (appendix A).
    const column = Math.max(...rows.map(([branch]) => branch.length)) + 2;
    return [
      [root.label(), root.describe()].filter(Boolean).join(' '),
      ...rows.map(([branch, summary]) => (summary ? branch.padEnd(column) + summary : branch)),
    ];
  }

  /** Yields each descendant in document order as [branch lines and label, summary]. */
  *#rows(parent: Shape, indent: string): Generator<[string, string]> {
    const children = parent.children();
    for (const [index, child] of children.entries()) {
      const last = index === children.length - 1;
      yield [`${indent}${last ? '└── ' : '├── '}${child.label()}`, child.describe()];
      yield* this.#rows(child, `${indent}${last ? '    ' : '│   '}`);
    }
  }
}
