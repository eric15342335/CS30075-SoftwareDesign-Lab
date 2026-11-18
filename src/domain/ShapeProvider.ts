import type { Shape } from '#domain/Shape.ts';

/**
 * Extension point 1. A shape provider adds one shape type. `create` uses it for `create <type>`,
 * and `read` uses it for elements with this tag name or with `data-kind="<type>"`.
 */
export interface ShapeProvider {
  /** The type name that the user types after `create`. */
  readonly type: string;
  /** Returns a new, empty shape. The kernel fills it through configure() or loadAttribute(). */
  create(id: string): Shape;
}
