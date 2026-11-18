import type { Workspace } from '@svgframe/api';

/**
 * ShapeStatistics counts the shapes of the current document. It walks the canvas children depth
 * first in their current order. Each leaf counts under its type, in the order in which the types
 * first appear. A container, such as g or box, counts only as a container. The root svg does not
 * count.
 */
export class ShapeStatistics {
  readonly #workspace: Workspace;

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
  }

  /** Returns one line such as `rect: 3  circle: 1  text: 2  (total 6, containers 2)`. */
  summary(): string {
    const leaves = new Map<string, number>();
    let containers = 0;
    for (const shape of this.#workspace.document().canvas.walk().drop(1)) {
      if (shape.asGroup() === null) leaves.set(shape.type, (leaves.get(shape.type) ?? 0) + 1);
      else containers += 1;
    }
    const total = [...leaves.values()].reduce((sum, count) => sum + count, 0);
    const counts = [...leaves].map(([type, count]) => `${type}: ${count}`);
    return [...counts, `(total ${total}, containers ${containers})`].join('  ');
  }
}
