import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EditorError } from '#domain/EditorError.ts';
import { SvgReader } from '#io/SvgReader.ts';
import { SvgWriter } from '#io/SvgWriter.ts';

const fixtures = join(import.meta.dir, '..', 'fixtures');
const dir = mkdtempSync(join(tmpdir(), 'svg-reader-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test('reading the spec file other.svg assigns rect1 with the spec warning', () => {
  const reader = new SvgReader();
  const document = reader.read(join(fixtures, 'other.svg'));
  expect(reader.warnings()).toEqual(['assigned id rect1 to unnamed <rect>']);
  expect(document.ids()).toEqual(['rect1', 't1', 'c1', 'g1', 'r2', 'c2', 'e1']);
  expect(document.canvas.size()).toBe('400x300');
  expect(document.find('t1').textContent()).toBe('imported');
});

test.each(['sample.svg', 'demo.svg', 'flowchart.svg'])(
  '%s, which uses the editor format, reads back and writes out byte for byte',
  (name) => {
    const text = readFileSync(join(fixtures, name), 'utf8');
    const reader = new SvgReader();
    expect(new SvgWriter().serialize(reader.parse(text))).toBe(text);
    expect(reader.warnings()).toEqual([]);
  },
);

test('the nested sample from the spec keeps transform and the other attributes, and the comments are dropped', () => {
  const reader = new SvgReader();
  const document = reader.read(join(fixtures, 'nested.svg'));
  expect(reader.warnings()).toEqual([
    'assigned id rect1 to unnamed <rect>',
    'assigned id text1 to unnamed <text>',
  ]);
  expect(new SvgWriter().serialize(document)).toBe(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
      '  <g id="diagram" transform="translate(60,40)">',
      '    <rect id="a" x="0" y="0" width="120" height="60" fill="#4a90d9"/>',
      '    <line id="e" x1="120" y1="30" x2="200" y2="30" stroke="black"/>',
      '    <g id="nodeB" transform="translate(200,0) scale(0.8)">',
      '      <rect id="rect1" x="0" y="0" width="120" height="60" fill="#f5a623"/>',
      '      <text id="text1" x="60" y="38" fill="white" text-anchor="middle" font-size="16">End</text>',
      '    </g>',
      '  </g>',
      '</svg>',
      '',
    ].join('\n'),
  );
});

test('a missing or duplicate id becomes the tag plus a number, and never an id that appears later', () => {
  const reader = new SvgReader();
  const document = reader.parse(
    [
      '<svg width="10" height="10">',
      '  <rect width="1" height="1"/>',
      '  <rect id="rect1" width="1" height="1"/>',
      '  <circle id="rect1" r="1"/>',
      '  <g id=""/>',
      '</svg>',
    ].join('\n'),
  );
  expect(document.ids()).toEqual(['rect2', 'rect1', 'circle1', 'g1']);
  expect(reader.warnings()).toEqual([
    'assigned id rect2 to unnamed <rect>',
    'assigned id circle1 to <circle> with duplicate id rect1',
    'assigned id g1 to unnamed <g>',
  ]);
});

test('unnamed elements of one type get numbers in order, and a reused reader starts counting again', () => {
  const reader = new SvgReader();
  const text =
    '<svg width="10" height="10"><g><rect width="1" height="1"/><rect width="1" height="1"/></g></svg>';
  const warnings = [
    'assigned id g1 to unnamed <g>',
    'assigned id rect1 to unnamed <rect>',
    'assigned id rect2 to unnamed <rect>',
  ];
  expect(reader.parse(text).ids()).toEqual(['g1', 'rect1', 'rect2']);
  expect(reader.warnings()).toEqual(warnings);
  expect(reader.parse(text).ids()).toEqual(['g1', 'rect1', 'rect2']);
  expect(reader.warnings()).toEqual(warnings);
});

test('the canvas size comes from width and height, or else from the size part of viewBox', () => {
  const reader = new SvgReader();
  expect(reader.parse('<svg viewBox=" 0,0  30,20 "/>').canvas.size()).toBe('30x20');
  expect(reader.parse('<svg width="50" viewBox="0 0 30 20"/>').canvas.size()).toBe('50x20');
  expect(() => reader.parse('<svg width="50"/>')).toThrow('<svg> has no width and height');
  expect(() => reader.parse('<svg height="50"/>')).toThrow('<svg> has no width and height');
});

test('the reader skips the elements that it cannot use, with one warning for each', () => {
  const reader = new SvgReader();
  const document = reader.parse(
    [
      '<svg viewBox="0 0 300 200">',
      '  <path id="p1" d="M0 0"/>',
      '  <defs><rect id="inside" width="1" height="1"/></defs>',
      '  <rect id="units" x="10px" width="1" height="1"/>',
      '  <rect id="negative" width="-1" height="1"/>',
      '  <text id="t" x="1" y="2">a<tspan>b</tspan>c</text>',
      '  stray text',
      '  <circle id="ok" r="3"/>',
      '</svg>',
    ].join('\n'),
  );
  expect(reader.warnings()).toEqual([
    'skipped <path id="p1">: unsupported element',
    'skipped <defs>: unsupported element',
    'skipped <rect id="units">: invalid number: 10px',
    'skipped <rect id="negative">: width must not be negative',
    'skipped <tspan>: text#t cannot contain elements',
  ]);
  expect(document.ids()).toEqual(['t', 'ok']);
  expect(document.find('t').textContent()).toBe('ac');
  expect(document.canvas.size()).toBe('300x200');
});

test('the root keeps unknown attributes, and a byte order mark and text with only digits are accepted', () => {
  const reader = new SvgReader();
  const bom = String.fromCodePoint(0xfeff);
  const document = reader.parse(
    `${bom}<svg version="1.1" viewBox="0 0 30 20" fill="none"><text id="t">007</text></svg>`,
  );
  expect(document.find('t').textContent()).toBe('007');
  expect(new SvgWriter().serialize(document)).toContain(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 30 20" fill="none" version="1.1">',
  );
});

test('text that is not usable SVG is rejected', () => {
  const reader = new SvgReader();
  expect(() => reader.parse('<svg><g></svg>')).toThrow(
    new EditorError(
      "line 1: Expected closing tag 'g' (opened in line 1, col 6) instead of closing tag 'svg'",
    ),
  );
  expect(() => reader.parse('<html/>')).toThrow('no <svg> root element');
  expect(() => reader.parse('<svg/>')).toThrow('<svg> has no width and height');
  expect(() => reader.parse('<svg width="100%" height="1"/>')).toThrow('invalid number: 100%');
});

test('read names the file in its errors', () => {
  const reader = new SvgReader();
  const missing = join(dir, 'missing.svg');
  expect(() => reader.read(missing)).toThrow(new EditorError(`cannot read file: ${missing}`));
  const broken = join(dir, 'broken.svg');
  writeFileSync(broken, '<svg><g></svg>');
  expect(() => reader.read(broken)).toThrow(`cannot read file: ${broken} (line 1: Expected`);
});
