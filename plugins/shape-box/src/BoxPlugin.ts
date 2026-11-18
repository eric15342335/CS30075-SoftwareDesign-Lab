import type { Plugin, PluginContext } from '@svgframe/api';

import { BoxAttributes } from './BoxAttributes.ts';
import { BoxProvider } from './BoxProvider.ts';
import { BoxTypeLabel } from './BoxTypeLabel.ts';

/**
 * The box plugin adds the shape type box, the attribute handler for its fill and label, and the
 * "(box)" tree label. The option `fill` sets the rect color of new boxes (default #4a90d9).
 */
export default class BoxPlugin implements Plugin {
  activate(context: PluginContext): void {
    const fill = context.options['fill'];
    context.addShape(new BoxProvider(typeof fill === 'string' ? fill : '#4a90d9'));
    context.addAttributeHandler(new BoxAttributes());
    context.addDecorator(new BoxTypeLabel());
  }
}
