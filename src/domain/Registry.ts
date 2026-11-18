import { EditorError } from '#domain/EditorError.ts';

/**
 * Registry keeps the extensions of one category by name, in the order of registration. It refuses
 * a second extension with a name that is already taken.
 */
export class Registry<T> {
  readonly #category: string;
  readonly #name: (item: T) => string;
  readonly #items = new Map<string, T>();

  /** The category is the word that a plugin manifest uses, such as "shapes" or "commands". */
  constructor(category: string, name: (item: T) => string) {
    this.#category = category;
    this.#name = name;
  }

  add(item: T): void {
    this.check([item]);
    this.#items.set(this.#name(item), item);
  }

  /** Throws when one of the items has a name that is taken, or when two of them share a name. */
  check(items: T[]): void {
    const taken = new Set(this.#items.keys());
    for (const name of items.map(this.#name)) {
      if (taken.has(name))
        throw new EditorError(`duplicate registration: ${this.#category}/${name}`);
      taken.add(name);
    }
  }

  /** Returns the key "category/name" of each item, as a plugin manifest writes it. */
  keys(items: T[]): string[] {
    return items.map((item) => `${this.#category}/${this.#name(item)}`);
  }

  get(name: string): T | undefined {
    return this.#items.get(name);
  }

  values(): T[] {
    return [...this.#items.values()];
  }
}
