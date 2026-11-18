import { Leaf } from '#domain/Leaf.ts';

/** A circle with a center (cx, cy) and a radius r. */
export class Circle extends Leaf {
  override readonly tag = 'circle';

  protected override geometry() {
    return { cx: 'x', cy: 'y', r: 'size' } as const;
  }
}
