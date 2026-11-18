import { expect, test } from 'bun:test';

import { SvgFileFilter } from '#ext/SvgFileFilter.ts';

const filter = new SvgFileFilter();

test.each(['/a/example.svg', '/a/LOGO.SVG', '/a/b.Svg'])(
  'the path %s counts as an SVG file',
  (path) => {
    expect(filter.matches(path)).toBe(true);
  },
);

test.each(['/a/notes.txt', '/a/image.svgz', '/a/example.svg.txt', '/a/svg'])(
  'the path %s does not count as an SVG file',
  (path) => {
    expect(filter.matches(path)).toBe(false);
  },
);
