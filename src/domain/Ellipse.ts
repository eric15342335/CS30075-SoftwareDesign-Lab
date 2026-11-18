import { Leaf } from '#domain/Leaf.ts';

/** An ellipse with a center (cx, cy) and the radii rx and ry. */
export class Ellipse extends Leaf {
  override readonly tag = 'ellipse';

  protected override geometry() {
    return { cx: 'x', cy: 'y', rx: 'size', ry: 'size' } as const;
  }
}
