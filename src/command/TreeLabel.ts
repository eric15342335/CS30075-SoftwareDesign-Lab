import type { Shape } from '#domain/Shape.ts';

/** The component interface of the Decorator pattern for the rows of `tree`. */
export interface TreeLabel {
  /** Returns the final text of a row, given the shape and the row without labels. */
  text(shape: Shape, row: string): string;
}
