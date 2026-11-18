import type { Memento } from '#domain/Memento.ts';

/**
 * AttributeChange records one write of one attribute. It keeps the old value as text for the
 * feedback, and a memento that restores the exact old value. For a number, the text has at most
 * 6 fraction digits, so the memento must not rely on the text.
 */
export class AttributeChange implements Memento {
  readonly #old: string | undefined;
  readonly #memento: Memento;

  constructor(old: string | undefined, memento: Memento) {
    this.#old = old;
    this.#memento = memento;
  }

  /** The old value as `show` would print it. The value undefined means that it was absent. */
  get old(): string | undefined {
    return this.#old;
  }

  restore(): void {
    this.#memento.restore();
  }
}
