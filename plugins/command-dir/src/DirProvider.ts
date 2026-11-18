import type { Command, CommandProvider } from '@svgframe/api';

import { DirCommand } from './DirCommand.ts';
import type { DirectoryListing } from './DirectoryListing.ts';

/** Registers the `dir` command. It takes no arguments. */
export class DirProvider implements CommandProvider {
  readonly name = 'dir';
  readonly syntax = '';
  readonly description = 'list the files and folders in the working directory';
  readonly #listing: DirectoryListing;

  constructor(listing: DirectoryListing) {
    this.#listing = listing;
  }

  create(): Command {
    return new DirCommand(this.#listing);
  }
}
