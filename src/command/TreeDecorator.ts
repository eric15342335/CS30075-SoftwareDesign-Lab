import type { Shape } from '#domain/Shape.ts';

/**
 * Extension point 3. A tree decorator adds a label at the end of the rows of `tree`. It returns
 * only its own label, and DecoratingLabel joins the labels of all decorators.
 */
export interface TreeDecorator {
  /** A stable name, which the plugin manifest lists under "decorators". */
  readonly name: string;
  /** Returns the label for the row of this shape, or undefined when the row gets no label. */
  label(shape: Shape): string | undefined;
}
