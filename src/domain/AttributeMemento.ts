import type { Memento } from '#domain/Memento.ts';
import type { Shape } from '#domain/Shape.ts';

/** Holds the value that one attribute had before `set`. The value undefined means it was absent. */
export class AttributeMemento implements Memento {
  readonly #shape: Shape;
  readonly #name: string;
  readonly #old: string | undefined;

  constructor(shape: Shape, name: string, old: string | undefined) {
    this.#shape = shape;
    this.#name = name;
    this.#old = old;
  }

  get old(): string | undefined {
    return this.#old;
  }

  restore(): void {
    this.#shape.setAttribute(this.#name, this.#old);
  }
}
