import { Leaf } from '#domain/Leaf.ts';
import type { CreateSignature } from '#domain/Shape.ts';

export class Line extends Leaf {
  override readonly tag = 'line';

  override createSignature(): CreateSignature {
    return { ...super.createSignature(), optional: 'stroke' };
  }

  protected override geometry() {
    return { x1: 'x', y1: 'y', x2: 'x', y2: 'y' } as const;
  }

  protected override summary(): string {
    return `(${this.value('x1')},${this.value('y1')}) -> (${this.value('x2')},${this.value('y2')})`;
  }
}
