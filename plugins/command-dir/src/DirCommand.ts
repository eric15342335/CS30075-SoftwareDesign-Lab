import { Command } from '@svgframe/api';

import type { DirectoryListing } from './DirectoryListing.ts';

/**
 * DirCommand forwards `dir` to its receiver. It needs no document and changes nothing, so it
 * keeps the default of Command: no history entry and no io barrier.
 */
export class DirCommand extends Command {
  readonly #listing: DirectoryListing;

  constructor(listing: DirectoryListing) {
    super();
    this.#listing = listing;
  }

  override execute(): string[] {
    return this.#listing.lines();
  }
}
