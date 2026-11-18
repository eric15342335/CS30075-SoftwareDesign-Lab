import type { ShapeProvider } from '@svgframe/api';

import { Box } from './Box.ts';

/** Registers the shape type "box". Each new box gets the rect fill from the plugin options. */
export class BoxProvider implements ShapeProvider {
  readonly type = Box.typeName;
  readonly #fill: string;

  constructor(fill: string) {
    this.#fill = fill;
  }

  create(id: string): Box {
    return new Box(id, this.#fill);
  }
}
