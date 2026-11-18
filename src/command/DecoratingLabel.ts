import type { TreeDecorator } from '#command/TreeDecorator.ts';
import type { TreeLabel } from '#command/TreeLabel.ts';
import { EditorError } from '#domain/EditorError.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * The decorator of the Decorator pattern, like DecoratingLabelProvider in JFace. It first asks the
 * label that it wraps, and then appends the label of one plugin decorator after one space.
 */
export class DecoratingLabel implements TreeLabel {
  readonly #inner: TreeLabel;
  readonly #decorator: TreeDecorator;

  constructor(inner: TreeLabel, decorator: TreeDecorator) {
    this.#inner = inner;
    this.#decorator = decorator;
  }

  text(shape: Shape, row: string): string {
    const text = this.#inner.text(shape, row);
    let label: string | undefined;
    try {
      label = this.#decorator.label(shape);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new EditorError(`tree decorator failed: ${this.#decorator.name} (${reason})`);
    }
    return label ? `${text} ${label}` : text;
  }
}
