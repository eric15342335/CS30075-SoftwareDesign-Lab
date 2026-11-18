import type { DirectoryEntry } from './DirectoryEntry.ts';

/**
 * The target interface of the Adapter pattern. DirectoryListing, the client side, defines it, so
 * the listing never depends on node:fs.
 */
export interface Directory {
  /** The path of the directory, for the error message. */
  path(): string;
  /** Returns the direct children in any order. It throws when the directory cannot be read. */
  entries(): DirectoryEntry[];
}
