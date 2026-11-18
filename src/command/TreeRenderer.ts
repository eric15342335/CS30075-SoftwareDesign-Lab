import { DecoratingLabel } from '#command/DecoratingLabel.ts';
import { PlainLabel } from '#command/PlainLabel.ts';
import type { TreeDecorator } from '#command/TreeDecorator.ts';
import type { TreeLabel } from '#command/TreeLabel.ts';
import type { Shape } from '#domain/Shape.ts';
import type { SvgDocument } from '#domain/SvgDocument.ts';

/**
 * TreeRenderer is the receiver of `tree`. It lists the shapes below the canvas, or below one
 * shape, with their summaries in a column. Then the chain of decorating labels adds the plugin
 * labels at the end of each row. The column depends only on the rows without labels, so labels
 * never move it.
 */
export class TreeRenderer {
  readonly #label: TreeLabel;

  /** Builds the chain once. The first registered decorator puts its label first. */
  constructor(decorators: readonly TreeDecorator[]) {
    this.#label = decorators.reduce<TreeLabel>(
      (inner, decorator) => new DecoratingLabel(inner, decorator),
      new PlainLabel(),
    );
  }

  render(document: SvgDocument, id?: string): string[] {
    const root = id === undefined ? document.canvas : document.find(id);
    const rows = this.#rows(root, '').toArray();
    // The examples in the spec align the summaries in different ways. Here, the summary column
    // starts 2 characters after the longest row (appendix A of the Phase 1 design).
    const column = Math.max(...rows.map(([branch]) => branch.length)) + 2;
    return [
      this.#label.text(root, [root.elementLabel(), root.describe()].filter(Boolean).join(' ')),
      ...rows.map(([branch, summary, shape]) =>
        this.#label.text(shape, summary ? branch.padEnd(column) + summary : branch),
      ),
    ];
  }

  /** Yields each descendant in document order as [branch lines and label, summary, shape]. */
  *#rows(parent: Shape, indent: string): Generator<[string, string, Shape]> {
    const children = parent.children();
    for (const [index, child] of children.entries()) {
      const last = index === children.length - 1;
      yield [`${indent}${last ? '└── ' : '├── '}${child.elementLabel()}`, child.describe(), child];
      yield* this.#rows(child, `${indent}${last ? '    ' : '│   '}`);
    }
  }
}
