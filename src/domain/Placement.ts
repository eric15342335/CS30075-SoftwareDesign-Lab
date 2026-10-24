import type { Group } from '#domain/Group.ts';
import type { Memento } from '#domain/Memento.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * Records where a shape is right now: its parent and its index. On restore, a shape that had no
 * parent is detached again.
 */
export class Placement implements Memento {
  readonly #shape: Shape;
  readonly #parent: Group | null;
  readonly #index: number;

  constructor(shape: Shape) {
    this.#shape = shape;
    this.#parent = shape.parent;
    this.#index = shape.parent?.indexOf(shape) ?? -1;
  }

  restore(): void {
    if (this.#parent === null) this.#shape.parent?.remove(this.#shape);
    else this.#parent.insert(this.#shape, this.#index);
  }
}
