import { describe, expect, test } from 'bun:test';

import { Canvas } from '#domain/Canvas.ts';
import { Decimal } from '#domain/Decimal.ts';
import type { Memento } from '#domain/Memento.ts';
import type { Shape } from '#domain/Shape.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';

const n = (value: number): Decimal => new Decimal(value);

function outline(shape: Shape, depth = 0): string[] {
  const line = `${'  '.repeat(depth)}${shape.label()} ${shape.describe()}`.trimEnd();
  return [line, ...shape.children().flatMap((child) => outline(child, depth + 1))];
}

function empty(): SvgDocument {
  return new SvgDocument(new Canvas(n(800), n(600)));
}

/** The spec's section 6 document right after `group markers c1 box`. */
function session(): SvgDocument {
  const doc = empty();
  doc.create('rect', 'bg', ['0', '0', '800', '600', '#ffffff']);
  doc.create('text', 'title', ['20', '40', 'My Diagram']);
  doc.create('circle', 'c1', ['100', '100', '20', 'red']);
  doc.create('rect', 'box', ['200', '80', '60', '60', '#3366ff']);
  doc.group('markers', ['c1', 'box']);
  return doc;
}

/** Root children a..f, for checking that structural undo puts every shape back at its index. */
function letters(): SvgDocument {
  const doc = empty();
  for (const id of 'abcdef') doc.create('g', id, []);
  return doc;
}

/** Runs one edit, checks the result, then checks that its memento restores the document exactly. */
function expectUndoable(doc: SvgDocument, edit: () => Memento, after: string[]): void {
  const before = outline(doc.canvas);
  const memento = edit();
  expect(outline(doc.canvas)).toEqual(after);
  memento.restore();
  expect(outline(doc.canvas)).toEqual(before);
}

function expectRejected(doc: SvgDocument, edit: () => unknown, message: string): void {
  const before = outline(doc.canvas);
  expect(edit).toThrow(message);
  expect(outline(doc.canvas)).toEqual(before);
}

describe('lookup', () => {
  test('builds the spec session document', () => {
    expect(outline(session().canvas)).toEqual([
      'svg (800x600)',
      '  rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
      '  text#title (20,40) "My Diagram"',
      '  g#markers',
      '    circle#c1 cx=100 cy=100 r=20 fill=red',
      '    rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  test('find and count skip the root', () => {
    const doc = session();
    expect(doc.find('c1').label()).toBe('circle#c1');
    expect(doc.count()).toBe(5);
    expect(() => doc.find('r9')).toThrow('no such shape: r9');
    expect(() => doc.find('')).toThrow('no such shape: ');
  });
});

describe('create', () => {
  test('in a container, undone by detaching', () => {
    const doc = session();
    expectUndoable(doc, () => doc.create('text', 'note', ['1', '2', 'hi'], 'markers'), [
      'svg (800x600)',
      '  rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
      '  text#title (20,40) "My Diagram"',
      '  g#markers',
      '    circle#c1 cx=100 cy=100 r=20 fill=red',
      '    rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
      '    text#note (1,2) "hi"',
    ]);
  });

  test('spec error messages', () => {
    const doc = session();
    const create =
      (...args: Parameters<SvgDocument['create']>) =>
      () =>
        doc.create(...args);
    expectRejected(
      doc,
      create('hexagon', 'h', []),
      'unknown shape type: hexagon (is the plugin loaded?)',
    );
    expectRejected(doc, create('rect', 'c1', ['0', '0', '1', '1']), 'id already exists: c1');
    expectRejected(doc, create('g', 'g2', [], 'node9'), 'no such container: node9');
    expectRejected(doc, create('g', 'g2', [], 'bg'), 'not a container: bg');
  });

  test('parameter count, values and ids are checked before anything changes', () => {
    const doc = session();
    const create =
      (...args: Parameters<SvgDocument['create']>) =>
      () =>
        doc.create(...args);
    expectRejected(
      doc,
      create('rect', 'r1', ['1', '2', '3']),
      'usage: create rect <id> <x> <y> <width> <height> [fill] [in <containerId>]',
    );
    expectRejected(doc, create('g', 'g2', ['x']), 'usage: create g <id> [in <containerId>]');
    expectRejected(doc, create('circle', 'c2', ['1', '2', '-3']), 'r must not be negative');
    expectRejected(doc, create('g', 'a b', []), 'invalid id: "a b"');
  });
});

describe('delete', () => {
  test('a leaf comes back at its old index', () => {
    const doc = session();
    expectUndoable(doc, () => doc.delete('c1'), [
      'svg (800x600)',
      '  rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
      '  text#title (20,40) "My Diagram"',
      '  g#markers',
      '    rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  test('a container goes with its descendants', () => {
    const doc = session();
    doc.delete('markers');
    expect(doc.count()).toBe(2);
  });
});

describe('move and scale', () => {
  test('moving a container moves every descendant', () => {
    const doc = session();
    expectUndoable(doc, () => doc.move('markers', n(0), n(100)), [
      'svg (800x600)',
      '  rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
      '  text#title (20,40) "My Diagram"',
      '  g#markers',
      '    circle#c1 cx=100 cy=200 r=20 fill=red',
      '    rect#box x=200 y=180 w=60 h=60 fill=#3366ff',
    ]);
  });

  test('scale undo restores exact values', () => {
    const doc = session();
    const before = outline(doc.canvas);
    const mementos = [3, 7, 0.1].map((factor) => doc.scale('markers', n(factor)));
    for (const memento of mementos.toReversed()) memento.restore();
    expect(outline(doc.canvas)).toEqual(before);
  });

  test('scale factor must be positive', () => {
    const doc = session();
    expectRejected(doc, () => doc.scale('c1', n(0)), 'scale factor must be positive');
    expectRejected(doc, () => doc.scale('c1', n(-2)), 'scale factor must be positive');
    expectRejected(doc, () => doc.move('r9', n(1), n(1)), 'no such shape: r9');
  });
});

describe('set', () => {
  test('changes one attribute and remembers the old value', () => {
    const doc = session();
    let old: string | undefined;
    expectUndoable(doc, () => {
      const memento = doc.set('title', 'text', 'My Diagram v2');
      old = memento.old;
      return memento;
    }, [
      'svg (800x600)',
      '  rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
      '  text#title (20,40) "My Diagram v2"',
      '  g#markers',
      '    circle#c1 cx=100 cy=100 r=20 fill=red',
      '    rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
    expect(old).toBe('My Diagram');
  });

  test('works on containers and rejects unknown attributes', () => {
    const doc = session();
    doc.set('markers', 'fill', 'blue');
    expect(doc.find('markers').describe()).toBe('fill=blue');
    expectRejected(doc, () => doc.set('c1', 'width', '3'), 'unknown attribute: width');
  });
});

describe('group', () => {
  test('members keep document order and the group takes the first one place', () => {
    const doc = letters();
    expectUndoable(doc, () => doc.group('g', ['e', 'a', 'c']), [
      'svg (800x600)',
      '  g#g',
      '    g#a',
      '    g#c',
      '    g#e',
      '  g#b',
      '  g#d',
      '  g#f',
    ]);
  });

  test('members may come from different parents', () => {
    const doc = session();
    expectUndoable(doc, () => doc.group('mix', ['box', 'title']), [
      'svg (800x600)',
      '  rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
      '  g#mix',
      '    text#title (20,40) "My Diagram"',
      '    rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
      '  g#markers',
      '    circle#c1 cx=100 cy=100 r=20 fill=red',
    ]);
  });

  test('spec error messages', () => {
    const doc = session();
    expectRejected(
      doc,
      () => doc.group('bad', ['c1', 'markers']),
      'cannot group a container into its own descendant: markers',
    );
    expectRejected(doc, () => doc.group('bg', ['c1']), 'id already exists: bg');
    expectRejected(doc, () => doc.group('g', ['c1', 'zz']), 'no such shape: zz');
    expectRejected(doc, () => doc.group('g', []), 'group needs at least one shape');
  });
});

describe('ungroup', () => {
  test('children take the container place', () => {
    const doc = letters();
    doc.create('g', 'inner', [], 'b');
    doc.create('rect', 'x', ['0', '0', '1', '1'], 'inner');
    doc.create('rect', 'y', ['0', '0', '2', '2'], 'inner');
    doc.create('g', 'after', [], 'b');
    expectUndoable(doc, () => doc.ungroup('inner'), [
      'svg (800x600)',
      '  g#a',
      '  g#b',
      '    rect#x x=0 y=0 w=1 h=1',
      '    rect#y x=0 y=0 w=2 h=2',
      '    g#after',
      '  g#c',
      '  g#d',
      '  g#e',
      '  g#f',
    ]);
  });

  test('spec error messages', () => {
    const doc = session();
    expectRejected(
      doc,
      () => doc.ungroup('markers'),
      'cannot ungroup top-level container: markers',
    );
    expectRejected(doc, () => doc.ungroup('bg'), 'not a container: bg');
    expectRejected(doc, () => doc.ungroup('zz'), 'no such container: zz');
  });
});

describe('addto, front and back', () => {
  test('addto appends to the container', () => {
    const doc = session();
    expectUndoable(doc, () => doc.addto('markers', 'bg'), [
      'svg (800x600)',
      '  text#title (20,40) "My Diagram"',
      '  g#markers',
      '    circle#c1 cx=100 cy=100 r=20 fill=red',
      '    rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
      '    rect#bg x=0 y=0 w=800 h=600 fill=#ffffff',
    ]);
  });

  test('addto refuses to move a container into itself or its descendant', () => {
    const doc = session();
    doc.create('g', 'inner', [], 'markers');
    const message = 'cannot group a container into its own descendant: markers';
    expectRejected(doc, () => doc.addto('markers', 'markers'), message);
    expectRejected(doc, () => doc.addto('inner', 'markers'), message);
    expectRejected(doc, () => doc.addto('zz', 'bg'), 'no such container: zz');
    expectRejected(doc, () => doc.addto('bg', 'title'), 'not a container: bg');
  });

  test('front moves to the end of the siblings, back to the start', () => {
    const doc = letters();
    const order = (): string =>
      doc.canvas
        .children()
        .map((shape) => shape.id)
        .join('');
    const front = doc.front('b');
    expect(order()).toBe('acdefb');
    front.restore();
    const back = doc.back('e');
    expect(order()).toBe('eabcdf');
    back.restore();
    expect(order()).toBe('abcdef');
  });
});
