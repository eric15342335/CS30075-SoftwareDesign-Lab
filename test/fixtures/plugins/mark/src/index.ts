import type { Plugin, PluginContext } from '@svgframe/api';

/** This plugin adds the `text` option, or "+", after every tree row. */
export default class MarkPlugin implements Plugin {
  activate(context: PluginContext): void {
    const text = context.options['text'];
    const label = typeof text === 'string' ? text : '+';
    context.addDecorator({ name: 'mark', label: () => label });
  }
}
