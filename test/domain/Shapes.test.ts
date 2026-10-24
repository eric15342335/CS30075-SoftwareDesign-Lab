import { describe, expect, test } from 'bun:test';

import { Canvas } from '#domain/Canvas.ts';
import { Circle } from '#domain/Circle.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Ellipse } from '#domain/Ellipse.ts';
import { Group } from '#domain/Group.ts';
import { Line } from '#domain/Line.ts';
import { Rect } from '#domain/Rect.ts';
import type { Shape } from '#domain/Shape.ts';
import { Text } from '#domain/Text.ts';

const n = (value: number): Decimal => new Decimal(value);

function withAttributes<T extends Shape>(shape: T, attributes: Record<string, string>): T {
  for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
  return shape;
}

function markers(): { group: Group; circle: Circle; rect: Rect } {
  const group = new Group('markers');
  const circle = withAttributes(new Circle('c1'), { cx: '100', cy: '100', r: '20' });
  const rect = withAttributes(new Rect('box'), { x: '200', y: '80', width: '60', height: '60' });
  group.insert(circle);
  group.insert(rect);
  return { group, circle, rect };
}

describe('leaf summaries match the spec tree lines', () => {
  test('rect', () => {
    const rect = withAttributes(new Rect('bg'), {
      x: '0',
      y: '0',
      width: '800',
      height: '600',
      fill: '#ffffff',
    });
    expect(rect.label()).toBe('rect#bg');
    expect(rect.describe()).toBe('x=0 y=0 w=800 h=600 fill=#ffffff');
  });

  test('circle', () => {
    const circle = withAttributes(new Circle('c1'), { cx: '100', cy: '100', r: '20', fill: 'red' });
    expect(circle.describe()).toBe('cx=100 cy=100 r=20 fill=red');
  });

  test('ellipse without fill', () => {
    const ellipse = withAttributes(new Ellipse('e1'), { cx: '1', cy: '2', rx: '3', ry: '4' });
    expect(ellipse.describe()).toBe('cx=1 cy=2 rx=3 ry=4');
  });

  test('line shows both ends and no stroke', () => {
    const line = withAttributes(new Line('arrow1'), {
      x1: '280',
      y1: '130',
      x2: '520',
      y2: '130',
      stroke: 'black',
    });
    expect(line.describe()).toBe('(280,130) -> (520,130)');
  });

  test('text shows position and quoted content', () => {
    const text = withAttributes(new Text('title'), { x: '20', y: '40', text: 'My Diagram' });
    expect(text.describe()).toBe('(20,40) "My Diagram"');
    expect(text.textContent()).toBe('My Diagram');
    expect(new Rect('r').textContent()).toBeUndefined();
  });
});

describe('leaf editing', () => {
  test('move shifts coordinates and reports the new position', () => {
    const circle = withAttributes(new Circle('c1'), { cx: '100', cy: '100', r: '20' });
    circle.move(n(30), n(0));
    expect(circle.describe()).toBe('cx=130 cy=100 r=20');
    expect(circle.movedPhrase()).toBe('to (130,100)');
  });

  test('move shifts both ends of a line', () => {
    const line = withAttributes(new Line('l'), { x1: '0', y1: '0', x2: '10', y2: '5' });
    line.move(n(1), n(2));
    expect(line.describe()).toBe('(1,2) -> (11,7)');
  });

  test('scale multiplies positions and sizes', () => {
    const rect = withAttributes(new Rect('r'), { x: '10', y: '20', width: '100', height: '50' });
    rect.scale(n(2));
    expect(rect.describe()).toBe('x=20 y=40 w=200 h=100');
  });

  test('set returns the old value', () => {
    const text = withAttributes(new Text('t'), { x: '1', text: 'a', fill: 'red' });
    expect(text.setAttribute('x', '2')).toBe('1');
    expect(text.setAttribute('text', 'b')).toBe('a');
    expect(text.setAttribute('fill', undefined)).toBe('red');
    expect(text.setAttribute('stroke', 'blue')).toBeUndefined();
    expect(text.describe()).toBe('(2,0) "b"');
  });

  test('removing geometry resets it to the SVG default 0', () => {
    const rect = withAttributes(new Rect('r'), { x: '5' });
    rect.setAttribute('x', undefined);
    expect(rect.describe()).toBe('x=0 y=0 w=0 h=0');
  });

  test('set accepts only whitelisted names', () => {
    const rect = new Rect('r');
    expect(() => rect.setAttribute('r', '1')).toThrow(EditorError);
    expect(() => rect.setAttribute('r', '1')).toThrow('unknown attribute: r');
    expect(() => rect.setAttribute('id', 'x')).toThrow('unknown attribute: id');
    expect(() => new Group('g').setAttribute('x', '1')).toThrow('unknown attribute: x');
  });

  test('geometry must be a finite number and sizes must not be negative', () => {
    const circle = new Circle('c');
    expect(() => circle.setAttribute('cx', 'abc')).toThrow('invalid number: abc');
    expect(() => circle.setAttribute('r', '-1')).toThrow('r must not be negative');
    circle.setAttribute('cx', '-5');
    expect(circle.describe()).toBe('cx=-5 cy=0 r=0');
  });

  test('attributes list id, geometry, presentation, then kept extras', () => {
    const rect = withAttributes(new Rect('r1'), {
      x: '10',
      y: '20',
      width: '100',
      height: '50',
      stroke: 'blue',
      fill: '#eee',
    });
    rect.loadAttribute('data-kind', 'box');
    expect(rect.attributes()).toEqual([
      ['id', 'r1'],
      ['x', '10'],
      ['y', '20'],
      ['width', '100'],
      ['height', '50'],
      ['fill', '#eee'],
      ['stroke', 'blue'],
      ['data-kind', 'box'],
    ]);
  });

  test('loadAttribute keeps unknown names and applies known ones', () => {
    const text = new Text('t');
    text.loadAttribute('x', '7');
    text.loadAttribute('font-size', '16');
    expect(text.describe()).toBe('(7,0) ""');
    expect(text.attributes()).toEqual([
      ['id', 't'],
      ['x', '7'],
      ['y', '0'],
      ['font-size', '16'],
    ]);
    expect(() => text.setAttribute('font-size', '20')).toThrow('unknown attribute: font-size');
  });

  test('show details: geometry line, then style line', () => {
    const circle = withAttributes(new Circle('c1'), { cx: '100', cy: '100', r: '20', fill: 'red' });
    expect(circle.details()).toEqual(['cx=100 cy=100 r=20', 'fill=red']);
    const text = withAttributes(new Text('t1'), { x: '20', y: '40', text: 'hi' });
    expect(text.details()).toEqual(['x=20 y=40', 'text="hi"']);
  });

  test('create signatures', () => {
    expect(new Rect('r').createSignature()).toEqual({
      required: ['x', 'y', 'width', 'height'],
      optional: 'fill',
    });
    expect(new Line('l').createSignature().optional).toBe('stroke');
    expect(new Text('t').createSignature()).toEqual({ required: ['x', 'y', 'text'] });
    expect(new Group('g').createSignature()).toEqual({ required: [] });
  });
});

describe('groups', () => {
  test('insert, remove and indexOf keep parent links', () => {
    const { group, circle, rect } = markers();
    expect(circle.parent).toBe(group);
    expect(group.indexOf(rect)).toBe(1);
    expect(group.remove(circle)).toBe(0);
    expect(circle.parent).toBeNull();
    group.insert(circle, 0);
    expect(group.children()).toEqual([circle, rect]);
  });

  test('insert takes the child out of its old parent first', () => {
    const { group, circle, rect } = markers();
    const other = new Group('other');
    other.insert(circle);
    expect(group.children()).toEqual([rect]);
    expect(circle.parent).toBe(other);
    other.insert(rect);
    other.insert(circle);
    expect(other.children()).toEqual([rect, circle]);
  });

  test('remove rejects a shape that is not a child', () => {
    expect(() => new Group('g').remove(new Rect('r'))).toThrow('rect#r is not a child of g#g');
  });

  test('move and scale reach every descendant', () => {
    const { group, circle, rect } = markers();
    const outer = new Group('outer');
    outer.insert(group);
    outer.move(n(0), n(100));
    expect(circle.describe()).toBe('cx=100 cy=200 r=20');
    expect(rect.describe()).toBe('x=200 y=180 w=60 h=60');
    outer.scale(n(0.5));
    expect(circle.describe()).toBe('cx=50 cy=100 r=10');
    expect(outer.movedPhrase(n(-0), n(-100))).toBe('by (0,-100)');
  });

  test('walk visits the subtree in document order', () => {
    const { group } = markers();
    const outer = new Group('outer');
    outer.insert(group);
    outer.insert(new Text('t'));
    expect(
      outer
        .walk()
        .map((shape) => shape.id)
        .toArray(),
    ).toEqual(['outer', 'markers', 'c1', 'box', 't']);
  });

  test('summary is empty unless a fill is set; details list the children', () => {
    const { group } = markers();
    expect(group.describe()).toBe('');
    expect(group.details()).toEqual(['children: circle#c1, rect#box']);
    group.setAttribute('fill', 'blue');
    group.loadAttribute('transform', 'translate(60,40)');
    expect(group.describe()).toBe('fill=blue');
    expect(group.details()).toEqual([
      'children: circle#c1, rect#box',
      'fill=blue transform=translate(60,40)',
    ]);
    expect(new Group('empty').details()).toEqual(['children: (none)']);
  });

  test('only groups answer asGroup', () => {
    const { group, circle } = markers();
    expect(group.asGroup()).toBe(group);
    expect(circle.asGroup()).toBeNull();
  });
});

describe('canvas', () => {
  test('is the tree root labelled svg', () => {
    const canvas = new Canvas(n(800), n(600));
    expect(canvas.label()).toBe('svg');
    expect(canvas.describe()).toBe('(800x600)');
    expect(canvas.children()).toEqual([]);
  });

  test('writes the root attributes with a matching viewBox', () => {
    const canvas = new Canvas(n(400), n(200));
    canvas.resize(n(500), n(300));
    expect(canvas.attributes()).toEqual([
      ['xmlns', 'http://www.w3.org/2000/svg'],
      ['width', '500'],
      ['height', '300'],
      ['viewBox', '0 0 500 300'],
    ]);
  });

  test('rejects sizes that are not positive', () => {
    expect(() => new Canvas(n(0), n(600))).toThrow('canvas size must be positive');
    expect(() => new Canvas(n(800), n(600)).resize(n(800), n(-1))).toThrow(
      'canvas size must be positive',
    );
  });
});
