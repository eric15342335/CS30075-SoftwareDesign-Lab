import type { Shape } from '#domain/Shape.ts';
import type { ShapeProvider } from '#domain/ShapeProvider.ts';

/** A shape provider for a shape class whose constructor takes only the id. */
export class BasicShapeProvider implements ShapeProvider {
  readonly type: string;
  readonly #Type: new (id: string) => Shape;

  constructor(type: string, Type: new (id: string) => Shape) {
    this.type = type;
    this.#Type = Type;
  }

  create(id: string): Shape {
    return new this.#Type(id);
  }
}
