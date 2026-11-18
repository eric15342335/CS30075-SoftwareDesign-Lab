import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import type { FileMetric } from '#scripts/metrics/FileMetric.ts';
import type { RoleMap } from '#scripts/metrics/RoleMap.ts';

/**
 * TreeMetrics measures every TypeScript file in one checked-out tree: its category, its lines,
 * its function units with their cyclomatic complexity (from oxlint) and its responsibility.
 */
export class TreeMetrics {
  static readonly #oxlint = join(
    import.meta.dir,
    '..',
    '..',
    'node_modules',
    'oxlint',
    'bin',
    'oxlint',
  );
  static readonly #config = join(import.meta.dir, 'complexity.oxlintrc.json');
  /** A doc comment right before an exported class or interface. It never crosses a comment end. */
  static readonly #docComment =
    /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+(?:default\s+)?(?:abstract\s+)?(?:class|interface|type)\s/;
  readonly #root: string;
  readonly #roles: RoleMap;
  /** Tells whether the report lists the files of this tree, so they need a responsibility. */
  readonly #listed: boolean;

  constructor(root: string, roles: RoleMap, listed: boolean) {
    this.#root = root;
    this.#roles = roles;
    this.#listed = listed;
  }

  measure(): FileMetric[] {
    const units = this.#complexity();
    return this.#files().map((path) => {
      const text = readFileSync(join(this.#root, path), 'utf8');
      const role = this.#roles.role(path);
      const found = units.get(path) ?? [];
      return {
        path,
        role,
        lines: text.split('\n').filter((line) => line.trim() !== '').length,
        functions: found.length,
        complexity: found.reduce((sum, value) => sum + value, 0),
        responsibility:
          this.#roles.isTest(path) || !this.#listed ? '' : TreeMetrics.#responsibility(path, text),
      };
    });
  }

  #files(): string[] {
    return readdirSync(this.#root, { recursive: true, encoding: 'utf8' })
      .map((path) => path.replaceAll('\\', '/'))
      .filter((path) => path.endsWith('.ts') && !path.split('/').includes('node_modules'))
      .toSorted();
  }

  /** Runs oxlint once on the tree and returns the complexity of each function unit, by file. */
  #complexity(): Map<string, number[]> {
    const child = Bun.spawnSync(
      [
        process.execPath,
        TreeMetrics.#oxlint,
        '-c',
        TreeMetrics.#config,
        '--disable-nested-config',
        '--format',
        'json',
        '.',
      ],
      { cwd: this.#root },
    );
    const units = new Map<string, number[]>();
    for (const { message, filename } of TreeMetrics.#diagnostics(child.stdout.toString())) {
      const value = /complexity of (\d+)/.exec(message)?.[1];
      if (value === undefined) continue;
      // oxlint prints paths relative to its working folder, so they are resolved first.
      const path = relative(this.#root, resolve(this.#root, filename)).replaceAll('\\', '/');
      units.set(path, [...(units.get(path) ?? []), Number(value)]);
    }
    return units;
  }

  static #diagnostics(json: string): { message: string; filename: string }[] {
    const report: unknown = JSON.parse(json);
    if (typeof report !== 'object' || report === null || !('diagnostics' in report)) {
      throw new Error('oxlint gave no diagnostics list');
    }
    const { diagnostics } = report;
    return Array.isArray(diagnostics)
      ? diagnostics.map((item: unknown) => ({
          message: TreeMetrics.#field(item, 'message'),
          filename: TreeMetrics.#field(item, 'filename'),
        }))
      : [];
  }

  static #field(item: unknown, name: string): string {
    const value = typeof item === 'object' && item !== null ? Reflect.get(item, name) : undefined;
    return typeof value === 'string' ? value : '';
  }

  /**
   * Takes the first sentence of the doc comment on the exported class, interface or type. A file
   * without one, such as an entry point, may use its first block of line comments instead. A
   * file with neither is an error: give it a doc comment.
   */
  static #responsibility(path: string, text: string): string {
    const comment =
      TreeMetrics.#docComment.exec(text)?.[1]?.replaceAll(/^\s*\*/gm, '') ??
      /^(?:\/\/.*\n)+/m.exec(text)?.[0].replaceAll(/^\/\/ ?/gm, '');
    const sentence = comment
      ?.replaceAll(/\s+/g, ' ')
      .trim()
      .match(/^.*?\.(?=\s|$)/)?.[0];
    if (sentence === undefined) throw new Error(`no responsibility for ${path}`);
    return sentence;
  }
}
