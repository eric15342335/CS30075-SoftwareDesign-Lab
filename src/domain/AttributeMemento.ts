import type { Memento } from '#domain/Memento.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * Holds the text value that one attribute had before `set`. The value undefined means that it was
 * absent. A style value or a text content is text already, so this restores it exactly.
 */
export class AttributeMemento implements Memento {
  readonly #shape: Shape;
  readonly #name: string;
  readonly #old: string | undefined;

  constructor(shape: Shape, name: string, old: string | undefined) {
    this.#shape = shape;
    this.#name = name;
    this.#old = old;
  }

  restore(): void {
    this.#shape.setAttribute(this.#name, this.#old);
  }
}
