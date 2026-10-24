import type { Memento } from '#domain/Memento.ts';

/** Mementos of a multi-step edit, each taken right before its step. Restoring newest first undoes the steps exactly. */
export class Journal implements Memento {
  readonly #steps: readonly Memento[];

  constructor(steps: readonly Memento[]) {
    this.#steps = steps;
  }

  restore(): void {
    for (const step of this.#steps.toReversed()) step.restore();
  }
}
