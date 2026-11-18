import { EditorError } from '@svgframe/api';

import type { Directory } from './Directory.ts';
import type { DirectoryEntry } from './DirectoryEntry.ts';

/**
 * DirectoryListing is the receiver of `dir`. It sorts the entries of a directory, directories
 * first and then files, each group by name in code unit order, and formats one line per entry.
 */
export class DirectoryListing {
  readonly #directory: Directory;

  constructor(directory: Directory) {
    this.#directory = directory;
  }

  lines(): string[] {
    let entries: DirectoryEntry[];
    try {
      entries = this.#directory.entries();
    } catch {
      throw new EditorError(`cannot read directory: ${this.#directory.path()}`);
    }
    if (entries.length === 0) return ['(empty directory)'];
    return entries
      .toSorted(
        (a, b) =>
          Number(b.directory) - Number(a.directory) ||
          (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
      )
      .map((entry) => (entry.directory ? `[DIR]  ${entry.name}` : `[FILE] ${entry.name}`));
  }
}
