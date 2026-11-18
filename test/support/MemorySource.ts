import type { PluginSource } from '#host/PluginSource.ts';

/**
 * A plugin source that needs no package on disk. It returns the manifest and the entry module that
 * the test gives it, or it fails like `import()` when the test gives an Error.
 */
export class MemorySource implements PluginSource {
  readonly module: string;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly #manifest: unknown;
  readonly #entry: unknown;

  constructor(
    module: string,
    manifest: unknown,
    entry: unknown,
    options?: Readonly<Record<string, unknown>>,
  ) {
    this.module = module;
    this.#manifest = manifest;
    this.#entry = entry;
    if (options !== undefined) this.options = options;
  }

  manifest(): Promise<unknown> {
    return MemorySource.#import({ default: this.#manifest });
  }

  load(): Promise<unknown> {
    return MemorySource.#import(this.#entry);
  }

  static #import(value: unknown): Promise<unknown> {
    if (value instanceof Error) return Promise.reject(value);
    if (typeof value === 'object' && value !== null && 'default' in value) {
      if (value.default instanceof Error) return Promise.reject(value.default);
    }
    return Promise.resolve(value);
  }
}
