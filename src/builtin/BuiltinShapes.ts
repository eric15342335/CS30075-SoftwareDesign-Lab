import { BasicShapeProvider } from '#domain/BasicShapeProvider.ts';
import type { Catalog } from '#domain/Catalog.ts';
import { Circle } from '#domain/Circle.ts';
import { Ellipse } from '#domain/Ellipse.ts';
import { Group } from '#domain/Group.ts';
import { Line } from '#domain/Line.ts';
import { Rect } from '#domain/Rect.ts';
import { Text } from '#domain/Text.ts';

/** The six shape types of Phase 1. They register through the same extension point as plugins. */
export class BuiltinShapes {
  static readonly #providers = [
    new BasicShapeProvider('rect', Rect),
    new BasicShapeProvider('circle', Circle),
    new BasicShapeProvider('ellipse', Ellipse),
    new BasicShapeProvider('line', Line),
    new BasicShapeProvider('text', Text),
    new BasicShapeProvider('g', Group),
  ];

  register(catalog: Catalog): void {
    for (const provider of BuiltinShapes.#providers) catalog.addShape(provider);
  }
}
