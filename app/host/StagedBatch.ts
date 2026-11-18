import type { Registry } from '#domain/Registry.ts';

/** StagedBatch holds the extensions of one category that a plugin registered, until the commit. */
export class StagedBatch<T> {
  readonly #registry: Registry<T>;
  readonly #items: T[] = [];

  constructor(registry: Registry<T>) {
    this.#registry = registry;
  }

  push(item: T): void {
    this.#items.push(item);
  }

  /** Throws when a name is taken or used twice. */
  check(): void {
    this.#registry.check(this.#items);
  }

  keys(): string[] {
    return this.#registry.keys(this.#items);
  }

  /** Adds the items to the registry. Call `check` first, so that no add can fail half way. */
  commit(): void {
    for (const item of this.#items) this.#registry.add(item);
  }
}
