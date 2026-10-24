import { Circle } from '#domain/Circle.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Ellipse } from '#domain/Ellipse.ts';
import { Group } from '#domain/Group.ts';
import { Line } from '#domain/Line.ts';
import { Rect } from '#domain/Rect.ts';
import type { Shape } from '#domain/Shape.ts';
import { Text } from '#domain/Text.ts';

type ShapeClass = new (id: string) => Shape;

/** ShapeFactory maps a type name to a shape class. Both `create` and `read` use it. */
export class ShapeFactory {
  // 待重构: This is one of the two allowed name dispatch points. The plugin phase will replace
  // this table with a ShapeProvider registry.
  readonly #types = new Map<string, ShapeClass>([
    ['rect', Rect],
    ['circle', Circle],
    ['ellipse', Ellipse],
    ['line', Line],
    ['text', Text],
    ['g', Group],
  ]);

  /** Tells whether the type is registered. The `read` command skips elements of other types. */
  supports(type: string): boolean {
    return this.#types.has(type);
  }

  create(type: string, id: string): Shape {
    const Type = this.#types.get(type);
    if (Type === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return new Type(id);
  }

  /** Returns the `create` syntax of each registered type, for `help`. */
  usages(): string[] {
    return this.#types
      .values()
      .map((Type) => new Type('').createUsage())
      .toArray();
  }
}
