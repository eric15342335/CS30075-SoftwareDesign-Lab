import { EditorError } from '#domain/EditorError.ts';

/**
 * PluginManifest is the part of a plugin's package.json that the host reads: the package `name`
 * and the `contributes` lists, which declare every extension that the plugin registers.
 */
export class PluginManifest {
  static readonly #categories = new Set([
    'shapes',
    'commands',
    'decorators',
    'attributes',
    'observers',
  ]);
  readonly name: string;
  /** The declared extensions as sorted "category/name" keys. */
  readonly #declared: string[];

  constructor(name: string, declared: string[]) {
    this.name = name;
    this.#declared = declared.toSorted();
  }

  /** Reads the parsed package.json. It throws when the file does not have the expected shape. */
  static parse(json: unknown, module: string): PluginManifest {
    const invalid = (reason: string): EditorError =>
      new EditorError(`invalid plugin manifest: ${module} (${reason})`);
    if (typeof json !== 'object' || json === null) throw invalid('not an object');
    if (!('name' in json) || typeof json.name !== 'string' || json.name === '') {
      throw invalid('no package name');
    }
    const contributes = 'contributes' in json ? json.contributes : {};
    if (typeof contributes !== 'object' || contributes === null || Array.isArray(contributes)) {
      throw invalid('contributes is not an object');
    }
    const declared = Object.entries(contributes).flatMap(([category, names]: [string, unknown]) => {
      if (!PluginManifest.#categories.has(category)) throw invalid(`unknown category: ${category}`);
      if (!Array.isArray(names) || !names.every((name) => typeof name === 'string')) {
        throw invalid(`${category} is not a list of names`);
      }
      return names.map((name) => `${category}/${name}`);
    });
    return new PluginManifest(json.name, declared);
  }

  /** Throws when the plugin registered other extensions than the manifest declares. */
  verify(registered: string[]): void {
    const sorted = registered.toSorted();
    if (sorted.join() === this.#declared.join()) return;
    const declared = PluginManifest.#list(this.#declared);
    throw new EditorError(
      `plugin manifest mismatch: ${this.name} (declared: ${declared}, registered: ${PluginManifest.#list(sorted)})`,
    );
  }

  static #list(keys: string[]): string {
    return keys.length === 0 ? 'none' : keys.join(', ');
  }
}
