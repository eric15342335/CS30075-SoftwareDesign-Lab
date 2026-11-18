import { expect, test } from 'bun:test';

import { BasicShapeProvider } from '#domain/BasicShapeProvider.ts';
import { Canvas } from '#domain/Canvas.ts';
import { Decimal } from '#domain/Decimal.ts';
import { Group } from '#domain/Group.ts';
import { Rect } from '#domain/Rect.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';
import { SvgReader } from '#io/SvgReader.ts';
import { SvgWriter } from '#io/SvgWriter.ts';
import { Session } from '#test/support/Session.ts';

/** A container type on the tag g, like the box plugin, but without parts. */
class Note extends Group {
  override get type(): string {
    return 'note';
  }
}

function catalogWithNote() {
  const catalog = Session.catalog();
  catalog.addShape(new BasicShapeProvider('note', Note));
  return catalog;
}

test('register: a second provider for a taken type name is refused', () => {
  const catalog = Session.catalog();
  expect(() => catalog.addShape(new BasicShapeProvider('rect', Rect))).toThrow(
    'duplicate registration: shapes/rect',
  );
});

test('invoke: create uses a registered provider, and feedback names the type', () => {
  const document = new SvgDocument(new Canvas(new Decimal(10), new Decimal(10)), catalogWithNote());
  document.create('note', 'n1', []);
  expect(document.find('n1').label()).toBe('note#n1');
  expect(document.find('n1').elementLabel()).toBe('g#n1');
});

test('invoke: read uses data-kind when the provider makes the same tag', () => {
  const text = '<svg width="10" height="10"><g id="n1" data-kind="note"/></svg>';
  const document = new SvgReader(catalogWithNote()).parse(text);
  expect(document.find('n1').type).toBe('note');
});

test('invoke: data-kind falls back to the tag when the provider makes another tag', () => {
  const text = '<svg width="10" height="10"><rect id="r1" data-kind="note"/></svg>';
  const document = new SvgReader(catalogWithNote()).parse(text);
  expect(document.find('r1').type).toBe('rect');
});

test('invoke: help lists the usage of each registered type, in registration order', () => {
  expect(catalogWithNote().usages().at(-1)).toBe('create note <id> [in <containerId>]');
});

test('default: an unknown type name asks whether the plugin is loaded', () => {
  const document = new SvgDocument(new Canvas(new Decimal(10), new Decimal(10)), Session.catalog());
  expect(() => document.create('box', 'n1', [])).toThrow(
    'unknown shape type: box (is the plugin loaded?)',
  );
});

test('default: without the plugin, a box reads as a plain g that keeps data-kind on save', () => {
  const text = '<svg width="10" height="10"><g id="n1" data-kind="box"/></svg>';
  const document = new SvgReader(Session.catalog()).parse(text);
  expect(document.find('n1').label()).toBe('g#n1');
  expect(new SvgWriter().serialize(document)).toContain('<g id="n1" data-kind="box"');
});
