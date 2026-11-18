import type { AttributeEdit } from '#domain/AttributeEdit.ts';
import type { Shape } from '#domain/Shape.ts';

/**
 * The default attribute rule. The kernel uses it when no registered handler is responsible. It
 * applies the Phase 1 rules: the shape accepts its own attributes and reports any other name as
 * `unknown attribute: <attr>`. It has the same apply() as a handler, but it is never registered.
 */
export class StandardAttributes {
  apply(shape: Shape, attr: string, value: string, edit: AttributeEdit): void {
    const { old } = edit.set(shape, attr, value);
    const restored = old === undefined ? `${attr} removed` : `${attr}="${old}"`;
    edit.report(
      `${shape.label()} updated: ${attr}="${value}"`,
      `${shape.label()} updated: ${restored}`,
    );
  }
}
