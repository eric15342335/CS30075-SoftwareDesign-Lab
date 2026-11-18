import { expect, test } from 'bun:test';

import { CreateCommand } from '#command/CreateCommand.ts';
import { InitCommand } from '#command/InitCommand.ts';
import { BasicShapeProvider } from '#domain/BasicShapeProvider.ts';
import type { Catalog } from '#domain/Catalog.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Group } from '#domain/Group.ts';
import type { Shape } from '#domain/Shape.ts';
import { SvgReader } from '#io/SvgReader.ts';
import { Session } from '#test/support/Session.ts';

/**
 * A test-only composite shape on the tag g. It owns two parts, <id>-a (a rect) and <id>-b (a
 * group), the same way as the box plugin owns its rect and text.
 */
class Pair extends Group {
  override get type(): string {
    return 'pair';
  }

  override configure(_args: readonly string[], catalog: Catalog): void {
    this.insert(catalog.createShape('rect', `${this.id}-a`));
    this.insert(catalog.createShape('g', `${this.id}-b`));
  }

  override loaded(): void {
    const types = this.children().map((child) => [child.id, child.type].join(':'));
    if (types.join(' ') !== `${this.id}-a:rect ${this.id}-b:g`) {
      throw new EditorError(`pair ${this.id} has wrong parts`);
    }
  }

  override holds(child: Shape): boolean {
    return child.id === `${this.id}-a` || child.id === `${this.id}-b`;
  }

  override dissolvable(): boolean {
    return false;
  }
}

function session(): Session {
  const catalog = Session.catalog();
  catalog.shapes.add(new BasicShapeProvider('pair', Pair));
  const result = new Session(catalog);
  result.run(new InitCommand(result.workspace));
  return result;
}

test('create builds the parts and names them in the feedback', () => {
  const s = session();
  s.create('g', 'outer');
  expect(s.run(new CreateCommand(s.workspace, 'pair', 'p', [], 'outer'))).toEqual([
    'pair#p created in g#outer (g#p + rect#p-a + g#p-b)',
  ]);
  expect(s.undo()).toEqual(['pair#p removed']);
  expect(s.document().ids()).toEqual(['outer']);
});

test('a part id that is taken makes the whole create fail and leaves nothing behind', () => {
  const s = session();
  s.create('g', 'p-b');
  expect(() => s.create('pair', 'p')).toThrow('id already exists: p-b');
  expect(s.document().ids()).toEqual(['p-b']);
});

test.each([
  ['delete', (s: Session) => s.document().delete('p-a')],
  ['addto', (s: Session) => s.document().addto('g1', 'p-a')],
  ['group', (s: Session) => s.document().group('g2', ['p-b'])],
])('%s refuses to take a part out of its composite shape', (_name, action) => {
  const s = session();
  s.create('pair', 'p');
  s.create('g', 'g1');
  expect(() => action(s)).toThrow('cannot remove a part of a composite shape: p-');
  expect(s.document().find('p').children()).toHaveLength(2);
});

test('front, back and moving the whole composite shape still work', () => {
  const s = session();
  s.create('pair', 'p');
  s.create('g', 'g1');
  const parts = (): string[] =>
    s
      .document()
      .find('p')
      .children()
      .map((child) => child.id);
  s.document().front('p-a');
  expect(parts()).toEqual(['p-b', 'p-a']);
  s.document().back('p-a');
  expect(parts()).toEqual(['p-a', 'p-b']);
  s.document().addto('g1', 'p');
  expect(s.document().find('p').parent?.id).toBe('g1');
});

test('ungroup refuses a composite shape before it checks the top level', () => {
  const s = session();
  s.create('pair', 'p');
  expect(() => s.document().ungroup('p')).toThrow('cannot ungroup composite shape: p');
});

test('ungroup refuses a group that is a part, because the parts would leave the composite', () => {
  const s = session();
  s.create('pair', 'p');
  expect(() => s.document().ungroup('p-b')).toThrow(
    'cannot remove a part of a composite shape: p-b',
  );
  expect(s.document().find('p-b').parent?.id).toBe('p');
});

test('read checks the parts after the children are in place', () => {
  const catalog = Session.catalog();
  catalog.shapes.add(new BasicShapeProvider('pair', Pair));
  const good =
    '<svg width="9" height="9"><g id="p" data-kind="pair"><rect id="p-a"/><g id="p-b"/></g></svg>';
  expect(new SvgReader(catalog).parse(good).find('p').type).toBe('pair');
  const skipped =
    '<svg width="9" height="9"><g id="p" data-kind="pair"><rect id="p-a" x="1px"/><g id="p-b"/></g></svg>';
  expect(() => new SvgReader(catalog).parse(skipped)).toThrow('pair p has wrong parts');
});

test('the id that the canvas keeps from a file cannot be taken by a new shape', () => {
  const document = new SvgReader(Session.catalog()).parse('<svg id="root" width="9" height="9"/>');
  expect(() => document.create('rect', 'root', ['0', '0', '1', '1'])).toThrow(
    'id already exists: root',
  );
});
