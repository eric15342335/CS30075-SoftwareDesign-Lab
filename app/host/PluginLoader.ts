import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { EditorError } from '#domain/EditorError.ts';
import type { PluginSource } from '#host/PluginSource.ts';

/**
 * PluginLoader is the source of one plugin from a config file. It resolves the module the way
 * `require` would from the config file, so a package name and a path relative to the config's
 * folder both work, whatever the working directory is.
 */
export class PluginLoader implements PluginSource {
  readonly module: string;
  readonly options: Readonly<Record<string, unknown>>;
  readonly #require: NodeJS.Require;

  /** The config path must be absolute. */
  constructor(configPath: string, module: string, options: Readonly<Record<string, unknown>>) {
    this.module = module;
    this.options = options;
    this.#require = createRequire(configPath);
  }

  // The package.json import goes through `exports`, so the package must export "./package.json".
  async manifest(): Promise<unknown> {
    return import(this.#url(`${this.module}/package.json`), { with: { type: 'json' } });
  }

  async load(): Promise<unknown> {
    return import(this.#url(this.module));
  }

  #url(id: string): string {
    let path: string;
    try {
      path = this.#require.resolve(id);
    } catch {
      throw new EditorError(`plugin not found: ${this.module}`);
    }
    return pathToFileURL(path).href;
  }
}
