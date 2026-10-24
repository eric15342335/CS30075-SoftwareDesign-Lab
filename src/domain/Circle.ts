import { Leaf } from '#domain/Leaf.ts';

export class Circle extends Leaf {
  override readonly tag = 'circle';

  protected override geometry() {
    return { cx: 'x', cy: 'y', r: 'size' } as const;
  }
}
