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
    const name = this.#name(item);
    if (this.#items.has(name)) {
      throw new EditorError(`duplicate registration: ${this.#category}/${name}`);
    }
    this.#items.set(name, item);
  }

  get(name: string): T | undefined {
    return this.#items.get(name);
  }

  values(): T[] {
    return [...this.#items.values()];
  }
}
