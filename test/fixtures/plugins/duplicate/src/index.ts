import { BasicShapeProvider, Group } from '@svgframe/api';
import type { Plugin, PluginContext } from '@svgframe/api';

/** This plugin registers the shape type "rect", which the built-in shapes already hold. */
export default class DuplicatePlugin implements Plugin {
  activate(context: PluginContext): void {
    context.addShape(new BasicShapeProvider('rect', Group));
  }
}
