import type { Decimal } from '#domain/Decimal.ts';
import type { Memento } from '#domain/Memento.ts';

/**
 * Holds the exact geometry of one leaf. Undo restores these saved values. Running move or scale
 * backwards would drift because of floating-point rounding.
 */
export class GeometryMemento implements Memento {
  readonly #target: Map<string, Decimal>;
  readonly #saved: ReadonlyMap<string, Decimal>;

  constructor(geometry: Map<string, Decimal>) {
    this.#target = geometry;
    this.#saved = new Map(geometry);
  }

  restore(): void {
    for (const [key, value] of this.#saved) this.#target.set(key, value);
  }
}
