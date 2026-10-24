import type { Group } from '#domain/Group.ts';
import type { Memento } from '#domain/Memento.ts';
import type { Shape } from '#domain/Shape.ts';

/** Where a shape sits right now: parent and index. A shape without a parent is detached again on restore. */
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
