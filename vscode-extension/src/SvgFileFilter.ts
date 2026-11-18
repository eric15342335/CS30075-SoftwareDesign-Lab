/** SvgFileFilter decides by name alone whether a path looks like an SVG file. It needs no VS Code API. */
export class SvgFileFilter {
  static readonly #extension = /\.svg$/i;

  /** Tells whether the path ends with ".svg". The check ignores case, so "LOGO.SVG" matches too. */
  matches(path: string): boolean {
    return SvgFileFilter.#extension.test(path);
  }
}
