import type { Role } from '#scripts/metrics/Role.ts';

/**
 * RoleMap puts each TypeScript file of a tree into one category by its directory. A reviewed
 * override for the git ref wins over the rules. A file that no rule matches is an error, so the
 * report never hides a file.
 */
export class RoleMap {
  static readonly #test = /(?:^|\/)(?:test|integration)\/|\.i?test\.ts$/;
  static readonly #rules: [RegExp, Role][] = [
    // The spec counts the VS Code extension apart from the CLI, its tests included.
    [/^vscode-extension\//, 'vscode'],
    [RoleMap.#test, 'tests'],
    [/^src\//, 'kernel'],
    [/^app\//, 'assembly'],
    [/^plugins\/[^/]+\/src\//, 'plugins'],
    [/^scripts\//, 'scripts'],
  ];
  /** Files whose category differs from what the directory says, for each git ref. */
  static readonly #reviewed: Readonly<Record<string, Readonly<Record<string, Role>>>> = {
    // In Phase 1, the composition root lived in src/. Phase 2 moved it to app/.
    final: { 'src/main.ts': 'assembly' },
  };
  readonly #overrides: Readonly<Record<string, Role>>;

  constructor(ref: string) {
    this.#overrides = RoleMap.#reviewed[ref] ?? {};
  }

  role(path: string): Role {
    const role =
      this.#overrides[path] ?? RoleMap.#rules.find(([pattern]) => pattern.test(path))?.[1];
    if (role === undefined) throw new Error(`unclassified file: ${path}`);
    return role;
  }

  /** Tells whether a file is a test, also when it counts with the VS Code extension. */
  isTest(path: string): boolean {
    return RoleMap.#test.test(path);
  }
}
