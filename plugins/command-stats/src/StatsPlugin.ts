import type { Plugin, PluginContext } from '@svgframe/api';

import { StatsProvider } from './StatsProvider.ts';

/** The stats plugin adds the `stats` command, which counts the shapes of the document by type. */
export default class StatsPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.addCommand(new StatsProvider());
  }
}
