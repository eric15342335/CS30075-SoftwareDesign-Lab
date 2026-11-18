import type { TreeDecorator } from '#command/TreeDecorator.ts';
import type { Shape } from '#domain/Shape.ts';

/** A test tree decorator. It returns whatever the function that the test gives it returns. */
export class FixedDecorator implements TreeDecorator {
  readonly name: string;
  readonly #label: (shape: Shape) => string | undefined;

  constructor(name: string, label: (shape: Shape) => string | undefined) {
    this.name = name;
    this.#label = label;
  }

  label(shape: Shape): string | undefined {
    return this.#label(shape);
  }
}
