import type { Shape, TreeDecorator } from '@svgframe/api';

/** BoxTypeLabel adds "(box)" to the tree row of a box, whose element is a plain g. */
export class BoxTypeLabel implements TreeDecorator {
  readonly name = 'box-type-label';

  label(shape: Shape): string | undefined {
    return shape.type === 'box' ? '(box)' : undefined;
  }
}
