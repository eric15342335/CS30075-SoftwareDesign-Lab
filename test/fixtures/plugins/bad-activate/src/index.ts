import { BasicShapeProvider, Group } from '@svgframe/api';
import type { Plugin, PluginContext } from '@svgframe/api';

/**
 * This plugin registers in three categories and then throws. The host must keep none of the
 * registrations.
 */
export default class BadActivatePlugin implements Plugin {
  activate(context: PluginContext): void {
    context.addShape(new BasicShapeProvider('blob', Group));
    context.addDecorator({ name: 'bad', label: () => 'bad' });
    context.observe({ name: 'spy', opened: () => {}, saved: () => {} });
    throw new Error('activate failed on purpose');
  }
}
