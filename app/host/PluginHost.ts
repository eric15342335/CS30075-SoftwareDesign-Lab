import type { Plugin } from '#api/Plugin.ts';
import type { Extensions } from '#command/Extensions.ts';
import { EditorError } from '#domain/EditorError.ts';
import { PluginManifest } from '#host/PluginManifest.ts';
import type { PluginSource } from '#host/PluginSource.ts';
import { StagedContext } from '#host/StagedContext.ts';

/**
 * PluginHost installs plugins into the extensions. Each plugin is installed completely or not at
 * all. A failure becomes one message, and the next plugin still loads.
 */
export class PluginHost {
  readonly #extensions: Extensions;

  constructor(extensions: Extensions) {
    this.#extensions = extensions;
  }

  /** Installs the plugins in list order and returns one message for each plugin that failed. */
  async installAll(sources: PluginSource[]): Promise<string[]> {
    const errors: string[] = [];
    for (const source of sources) {
      // Each plugin sees the registrations of the plugins before it, so they load one by one.
      // oxlint-disable-next-line no-await-in-loop
      const error = await this.install(source);
      if (error !== undefined) errors.push(error);
    }
    return errors;
  }

  /** Installs one plugin. It returns the error message, or undefined when the plugin is in. */
  async install(source: PluginSource): Promise<string | undefined> {
    try {
      await this.#install(source);
      return undefined;
    } catch (error) {
      return PluginHost.#reason(error);
    }
  }

  async #install(source: PluginSource): Promise<void> {
    const json = PluginHost.#default(
      await PluginHost.#load(source.module, () => source.manifest()),
    );
    const manifest = PluginManifest.parse(json, source.module);
    const entry = await PluginHost.#load(source.module, () => source.load());
    const Type = PluginHost.#default(entry);
    if (Type === undefined) throw new EditorError(`plugin has no default export: ${source.module}`);
    const context = new StagedContext(this.#extensions, source.options ?? {});
    try {
      PluginHost.#activate(Type, context, manifest.name);
      context.check();
      manifest.verify(context.registered());
      context.commit();
    } finally {
      context.close();
    }
  }

  static async #load(module: string, load: () => Promise<unknown>): Promise<unknown> {
    try {
      return await load();
    } catch (error) {
      throw new EditorError(`plugin failed to load: ${module} (${PluginHost.#reason(error)})`);
    }
  }

  static #activate(Type: unknown, context: StagedContext, name: string): void {
    try {
      if (!PluginHost.#isClass(Type)) throw new TypeError('the default export is not a class');
      new Type().activate(context);
    } catch (error) {
      throw new EditorError(`plugin failed to activate: ${name} (${PluginHost.#reason(error)})`);
    }
  }

  // A function is all that the host can check before it calls `new`. A function that is no
  // plugin class throws in `new` or in `activate`, and #activate reports that.
  static #isClass(value: unknown): value is new () => Plugin {
    return typeof value === 'function';
  }

  static #default(namespace: unknown): unknown {
    return typeof namespace === 'object' && namespace !== null && 'default' in namespace
      ? namespace.default
      : undefined;
  }

  static #reason(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
