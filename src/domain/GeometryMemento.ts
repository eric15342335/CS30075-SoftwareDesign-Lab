import type { Decimal } from '#domain/Decimal.ts';
import type { Memento } from '#domain/Memento.ts';

/** Exact geometry of one leaf. Undo restores the saved values instead of running move/scale backwards, which would drift with floats. */
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
