import { PluginConfig } from '#host/PluginConfig.ts';
import type { PluginSource } from '#host/PluginSource.ts';

/**
 * Assembly reads the command line and picks the plugins. Mode A (no flag) loads the plugins that
 * the build ships. Mode B (`--config <file>`) loads the plugins of a config file instead.
 * `--no-plugins` loads none. A config file that is not valid loads none and gives one problem.
 */
export class Assembly {
  readonly sources: PluginSource[];
  readonly problems: string[];

  constructor(sources: PluginSource[], problems: string[] = []) {
    this.sources = sources;
    this.problems = problems;
  }

  static from(args: string[], shipped: PluginSource[]): Assembly {
    if (args.includes('--no-plugins')) return new Assembly([]);
    const at = args.indexOf('--config');
    if (at === -1) return new Assembly(shipped);
    try {
      return new Assembly(PluginConfig.read(args[at + 1] ?? '').sources());
    } catch (error) {
      return new Assembly([], [error instanceof Error ? error.message : String(error)]);
    }
  }
}
