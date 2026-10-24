import { Leaf } from '#domain/Leaf.ts';

export class Ellipse extends Leaf {
  override readonly tag = 'ellipse';

  protected override geometry() {
    return { cx: 'x', cy: 'y', rx: 'size', ry: 'size' } as const;
  }
}
