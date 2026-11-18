import type * as fs from 'node:fs';

import type { Directory } from './Directory.ts';
import type { DirectoryEntry } from './DirectoryEntry.ts';

/**
 * The adapter of the Adapter pattern. It holds the node:fs module (the adaptee) and translates
 * its directory entries into the Directory interface. The path comes from a function, so the
 * listing always shows the working directory at the time of the command.
 */
export class NodeDirectory implements Directory {
  readonly #fs: Pick<typeof fs, 'readdirSync'>;
  readonly #cwd: () => string;

  constructor(fileSystem: Pick<typeof fs, 'readdirSync'>, cwd: () => string) {
    this.#fs = fileSystem;
    this.#cwd = cwd;
  }

  path(): string {
    return this.#cwd();
  }

  entries(): DirectoryEntry[] {
    // isDirectory() is false for a symbolic link, so a link shows as a file and is not followed.
    return this.#fs
      .readdirSync(this.path(), { withFileTypes: true })
      .map((entry) => ({ name: entry.name, directory: entry.isDirectory() }));
  }
}
