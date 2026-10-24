import { Leaf } from '#domain/Leaf.ts';

export class Rect extends Leaf {
  override readonly tag = 'rect';

  protected override geometry() {
    return { x: 'x', y: 'y', width: 'size', height: 'size' } as const;
  }

  protected override summary(): string {
    return `x=${this.value('x')} y=${this.value('y')} w=${this.value('width')} h=${this.value('height')}`;
  }
}
