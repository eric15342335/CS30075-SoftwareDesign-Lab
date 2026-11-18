import { expect, test } from 'bun:test';

import { type OutlineElement, SvgOutline } from '#ext/SvgOutline.ts';

const outline = new SvgOutline();

/** Turns the outline into nested labels, so that a test can compare the whole tree at once. */
function labels(elements: readonly OutlineElement[]): unknown[] {
  return elements.map((element) =>
    element.children.length === 0 ? element.label : [element.label, labels(element.children)],
  );
}

/** Returns the source text that an element covers, and the text of its tag name. */
function spans(text: string, element: OutlineElement): [string, string] {
  return [text.slice(element.start, element.end), text.slice(element.nameStart, element.nameEnd)];
}

test('nested groups give a nested outline with the root, the containers and the leaves', () => {
  const text = [
    '<svg width="10" height="10">',
    '  <g id="outer"><g id="inner"><rect id="r1"/></g></g>',
    '  <circle id="c1"/>',
    '</svg>',
  ].join('\n');
  expect(labels(outline.elements(text))).toEqual([
    ['svg', [['g#outer', [['g#inner', ['rect#r1']]]], 'circle#c1']],
  ]);
});

test('an element without an id shows only its tag name', () => {
  const [svg] = outline.elements('<svg><text x="1">Hello</text></svg>');
  expect(svg?.children.map((child) => child.label)).toEqual(['text']);
});

test('each element covers its source text from "<" to the closing ">"', () => {
  const text = '<svg>\n  <g id="a">\n    <rect id="b" />\n  </g>\n</svg>';
  const [svg] = outline.elements(text);
  const group = svg?.children[0];
  const rect = group?.children[0];
  expect(svg && spans(text, svg)).toEqual([text, 'svg']);
  expect(group && spans(text, group)).toEqual(['<g id="a">\n    <rect id="b" />\n  </g>', 'g']);
  expect(rect && spans(text, rect)).toEqual(['<rect id="b" />', 'rect']);
});

test('the offsets stay right with CRLF line ends and characters outside the BMP', () => {
  const text = '<svg>\r\n<text id="t">😀 emoji</text>\r\n<rect id="after"/>\r\n</svg>';
  const [svg] = outline.elements(text);
  const [label, rect] = svg?.children ?? [];
  expect(label && spans(text, label)).toEqual(['<text id="t">😀 emoji</text>', 'text']);
  expect(rect && spans(text, rect)).toEqual(['<rect id="after"/>', 'rect']);
});

test('an XML declaration and comments do not appear in the outline', () => {
  const text = '<?xml version="1.0"?>\n<!-- note -->\n<svg><!-- inner --><rect id="r"/></svg>';
  expect(labels(outline.elements(text))).toEqual([['svg', ['rect#r']]]);
});

test.each([
  ['an unclosed element', '<svg><g id="a"><rect id="r"/></svg>'],
  ['a tag that is cut off', '<svg><rect id="r"'],
  ['an empty file', ''],
  ['plain text', 'not xml at all'],
])('%s gives an empty outline and does not throw', (_name, text) => {
  expect(outline.elements(text)).toEqual([]);
});
