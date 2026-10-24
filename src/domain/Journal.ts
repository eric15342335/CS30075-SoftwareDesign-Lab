import type { Memento } from '#domain/Memento.ts';

/**
 * A journal holds the mementos of an edit with several steps. Each memento is taken right before
 * its step. Restoring them from newest to oldest undoes the steps exactly.
 */
export class Journal implements Memento {
  readonly #steps: readonly Memento[];

  constructor(steps: readonly Memento[]) {
    this.#steps = steps;
  }

  restore(): void {
    for (const step of this.#steps.toReversed()) step.restore();
  }
}
