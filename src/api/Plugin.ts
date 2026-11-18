import type { PluginContext } from '#api/PluginContext.ts';

/**
 * A plugin is the default export of a plugin package: a class whose constructor takes no
 * arguments. The host creates one instance and calls `activate` once.
 */
export interface Plugin {
  /**
   * Registers the plugin's extensions through the context. It must be synchronous. When it
   * throws, the host keeps none of the registrations.
   */
  activate(context: PluginContext): void;
}
