import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EditorError } from '#domain/EditorError.ts';
import { PluginLoader } from '#host/PluginLoader.ts';

/**
 * PluginConfig is the config file of mode B. It lists the plugins to load, in order:
 * `{ "plugins": [{ "module": "...", "enabled": true, "options": {} }] }`. The whole file is checked
 * before any plugin loads.
 */
export class PluginConfig {
  readonly #loaders: PluginLoader[];

  constructor(loaders: PluginLoader[]) {
    this.#loaders = loaders;
  }

  /** Reads and checks the file. It throws `invalid plugin config` when anything is wrong. */
  static read(path: string): PluginConfig {
    const invalid = (reason: string): EditorError =>
      new EditorError(`invalid plugin config: ${path} (${reason})`);
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      throw invalid('cannot read the file');
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw invalid('not valid JSON');
    }
    if (typeof json !== 'object' || json === null || !('plugins' in json)) {
      throw invalid('no plugins list');
    }
    const { plugins } = json;
    if (!Array.isArray(plugins)) throw invalid('plugins is not a list');
    const absolute = resolve(path);
    const loaders = plugins.flatMap((entry: unknown, index) => {
      const at = `entry ${index + 1}`;
      if (typeof entry !== 'object' || entry === null) throw invalid(`${at} is not an object`);
      if (!('module' in entry) || typeof entry.module !== 'string' || entry.module === '') {
        throw invalid(`${at} has no module`);
      }
      const enabled = 'enabled' in entry ? entry.enabled : true;
      if (typeof enabled !== 'boolean') throw invalid(`${at}: enabled is not true or false`);
      const options = 'options' in entry ? entry.options : {};
      if (!PluginConfig.#isOptions(options)) throw invalid(`${at}: options is not an object`);
      return enabled ? [new PluginLoader(absolute, entry.module, options)] : [];
    });
    return new PluginConfig(loaders);
  }

  /** Returns the sources of the enabled plugins, in the order of the file. */
  sources(): PluginLoader[] {
    return [...this.#loaders];
  }

  static #isOptions(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
