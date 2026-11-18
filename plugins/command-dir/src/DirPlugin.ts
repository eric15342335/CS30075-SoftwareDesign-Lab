import * as fs from 'node:fs';

import type { Plugin, PluginContext } from '@svgframe/api';

import { DirectoryListing } from './DirectoryListing.ts';
import { DirProvider } from './DirProvider.ts';
import { NodeDirectory } from './NodeDirectory.ts';

/** The dir plugin adds the `dir` command. It reads the file system through NodeDirectory. */
export default class DirPlugin implements Plugin {
  activate(context: PluginContext): void {
    const directory = new NodeDirectory(fs, () => process.cwd());
    context.addCommand(new DirProvider(new DirectoryListing(directory)));
  }
}
