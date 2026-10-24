import { expect, test } from 'bun:test';

import { DeleteCommand } from '#command/DeleteCommand.ts';
import { MoveCommand } from '#command/MoveCommand.ts';
import { ScaleCommand } from '#command/ScaleCommand.ts';
import { SetCommand } from '#command/SetCommand.ts';
import { Decimal } from '#domain/Decimal.ts';
import { Session } from '#test/support/Session.ts';

const n = (value: number): Decimal => new Decimal(value);

test('move, undo and redo give the spec feedback for a leaf', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  expect(session.run(new MoveCommand(session.workspace, 'c1', n(30), n(0)))).toEqual([
    'circle#c1 moved to (130,100)',
  ]);
  const after = session.fingerprint();
  expect(session.undo()).toEqual(['circle#c1 moved back to (100,100)']);
  expect(session.fingerprint()).toEqual(before);
  expect(session.redo()).toEqual(['circle#c1 moved to (130,100)']);
  expect(session.fingerprint()).toEqual(after);
});

test('move gives the spec feedback for a container', () => {
  const session = Session.spec();
  session.create('g', 'node2');
  expect(session.run(new MoveCommand(session.workspace, 'node2', n(0), n(100)))).toEqual([
    'g#node2 moved by (0,100)',
  ]);
  expect(session.undo()).toEqual(['g#node2 moved back by (0,-100)']);
});

test('set reports the new value, and its undo reports the old one', () => {
  const session = Session.spec();
  expect(session.run(new SetCommand(session.workspace, 'title', 'text', 'My Diagram v2'))).toEqual([
    'text#title updated: text="My Diagram v2"',
  ]);
  expect(session.undo()).toEqual(['text#title updated: text="My Diagram"']);
});

test('undoing set on a new attribute removes the attribute', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  session.run(new SetCommand(session.workspace, 'bg', 'stroke', 'black'));
  expect(session.run(new SetCommand(session.workspace, 'bg', 'stroke-width', '2'))).toEqual([
    'rect#bg updated: stroke-width="2"',
  ]);
  expect(session.undo()).toEqual(['rect#bg updated: stroke-width removed']);
  expect(session.undo()).toEqual(['rect#bg updated: stroke removed']);
  expect(session.fingerprint()).toEqual(before);
});

test('delete gives the spec feedback, and undo restores the shape into its old parent', () => {
  const session = Session.spec();
  session.create('g', 'markers');
  session.create('rect', 'inner', ['1', '2', '3', '4'], 'markers');
  const before = session.fingerprint();
  expect(session.run(new DeleteCommand(session.workspace, 'inner'))).toEqual([
    'rect#inner deleted',
  ]);
  expect(session.undo()).toEqual(['rect#inner restored into g#markers']);
  expect(session.fingerprint()).toEqual(before);
});

test('scale gives feedback, and undo restores the exact values', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  expect(session.run(new ScaleCommand(session.workspace, 'c1', n(3)))).toEqual([
    'circle#c1 scaled by 3',
  ]);
  expect(session.undo()).toEqual(['circle#c1 scaled back by 1/3']);
  expect(session.fingerprint()).toEqual(before);
});

test('failed edits change nothing and are not recorded', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  expect(() => session.run(new ScaleCommand(session.workspace, 'c1', n(0)))).toThrow(
    'scale factor must be positive',
  );
  expect(() => session.run(new SetCommand(session.workspace, 'c1', 'width', '3'))).toThrow(
    'unknown attribute: width',
  );
  expect(() => session.run(new DeleteCommand(session.workspace, 'r9'))).toThrow(
    'no such shape: r9',
  );
  expect(session.fingerprint()).toEqual(before);
  expect(session.undo()).toEqual(['rect#box removed']);
});
