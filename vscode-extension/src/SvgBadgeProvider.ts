import {
  FileDecoration,
  type FileDecorationProvider,
  type FileSystem,
  FileType,
  type Uri,
} from 'vscode';

import { SvgFileFilter } from '#ext/SvgFileFilter.ts';

/**
 * SvgBadgeProvider gives every SVG file in the Explorer the badge "[]". VS Code asks it for the
 * decoration of each visible item and draws the badge next to the name. The file name and the file
 * content stay unchanged.
 */
export class SvgBadgeProvider implements FileDecorationProvider {
  static readonly #badge = new FileDecoration('[]', 'SVG file');
  readonly #filter = new SvgFileFilter();
  readonly #files: FileSystem;

  constructor(files: FileSystem) {
    this.#files = files;
  }

  async provideFileDecoration(uri: Uri): Promise<FileDecoration | undefined> {
    if (!this.#filter.matches(uri.path)) return undefined;
    try {
      // A folder can also have a name such as "icons.svg". Only files get the badge.
      const { type } = await this.#files.stat(uri);
      return (type & FileType.File) === 0 ? undefined : SvgBadgeProvider.#badge;
    } catch {
      // The item may be gone already. In that case, it gets no badge.
      return undefined;
    }
  }
}
