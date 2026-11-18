import type { AttributeChange } from '#domain/AttributeChange.ts';
import type { Memento } from '#domain/Memento.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * AttributeEdit collects every write of one `set` command, so that one undo restores all of them.
 * An attribute handler writes only through set(). Each write records the exact old value first.
 */
export class AttributeEdit implements Memento {
  readonly #changes: AttributeChange[] = [];
  readonly #done: string[] = [];
  readonly #undone: string[] = [];

  /** Writes one attribute of one shape. An invalid value throws before the shape changes. */
  set(target: Shape, name: string, value: string | undefined): AttributeChange {
    const change = target.setAttribute(name, value);
    this.#changes.push(change);
    return change;
  }

  /** Adds the line that `set` prints, and the line that its undo prints. */
  report(done: string, undone: string): void {
    this.#done.push(done);
    this.#undone.push(undone);
  }

  /** Restores the writes from the newest to the oldest, so a shape written twice ends up right. */
  restore(): void {
    for (const change of this.#changes.toReversed()) change.restore();
  }

  feedback(): string[] {
    return [...this.#done];
  }

  undoFeedback(): string[] {
    return [...this.#undone];
  }
}
