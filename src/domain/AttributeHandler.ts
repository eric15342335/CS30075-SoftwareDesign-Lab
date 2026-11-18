import type { AttributeEdit } from '#domain/AttributeEdit.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * Extension point 4. An attribute handler defines what `set <id> <attr> <value>` does for some
 * shapes and attributes (ADR 1 in doc/README.md).
 */
export interface AttributeHandler {
  /** A stable name, which the plugin manifest lists under "attributes". */
  readonly name: string;
  /**
   * Tells whether this handler is responsible for the attribute on this shape. It must not change
   * anything, and it may only look at the shape and its descendants.
   */
  handles(shape: Shape, attr: string): boolean;
  /**
   * Makes the change. Every write must go through edit.set(), and edit.report() adds the feedback
   * lines for `set` and for its undo. When the handler throws, the kernel restores every write.
   */
  apply(shape: Shape, attr: string, value: string, edit: AttributeEdit): void;
}
