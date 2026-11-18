import type { TreeLabel } from '#command/TreeLabel.ts';

/** The concrete component of the Decorator pattern. It returns the row as it is. */
export class PlainLabel implements TreeLabel {
  text(_shape: unknown, row: string): string {
    return row;
  }
}
