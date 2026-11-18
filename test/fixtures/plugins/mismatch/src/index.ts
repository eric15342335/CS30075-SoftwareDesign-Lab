import type { Plugin, PluginContext } from '@svgframe/api';

/** This plugin registers a decorator with another name than its manifest declares. */
export default class MismatchPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.addDecorator({ name: 'other', label: () => undefined });
  }
}
