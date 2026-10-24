import { expect, test } from 'bun:test';

import { AddtoCommand } from '#command/AddtoCommand.ts';
import { BackCommand } from '#command/BackCommand.ts';
import { FrontCommand } from '#command/FrontCommand.ts';
import { GroupCommand } from '#command/GroupCommand.ts';
import { UngroupCommand } from '#command/UngroupCommand.ts';
import { Session } from '#test/support/Session.ts';

test('group: spec feedback, undo and redo', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  expect(session.run(new GroupCommand(session.workspace, 'markers', ['c1', 'box']))).toEqual([
    'g#markers created with 2 children',
  ]);
  const after = session.fingerprint();
  expect(session.undo()).toEqual(['g#markers ungrouped']);
  expect(session.fingerprint()).toEqual(before);
  expect(session.redo()).toEqual(['g#markers created with 2 children']);
  expect(session.fingerprint()).toEqual(after);
});

test('group: one member reads as one child', () => {
  const session = Session.spec();
  expect(session.run(new GroupCommand(session.workspace, 'solo', ['bg']))).toEqual([
    'g#solo created with 1 child',
  ]);
});

test('group: the spec error leaves history alone', () => {
  const session = Session.spec();
  session.run(new GroupCommand(session.workspace, 'markers', ['c1', 'box']));
  expect(() => session.run(new GroupCommand(session.workspace, 'bad', ['c1', 'markers']))).toThrow(
    'cannot group a container into its own descendant: markers',
  );
  expect(session.undo()).toEqual(['g#markers ungrouped']);
});

test('ungroup: feedback and exact undo', () => {
  const session = Session.spec();
  session.create('g', 'outer');
  session.create('g', 'inner', [], 'outer');
  session.create('rect', 'r1', ['0', '0', '1', '1'], 'inner');
  const before = session.fingerprint();
  expect(session.run(new UngroupCommand(session.workspace, 'inner'))).toEqual([
    'g#inner ungrouped',
  ]);
  expect(session.document().find('r1').parent?.id).toBe('outer');
  expect(session.undo()).toEqual(['g#inner regrouped']);
  expect(session.fingerprint()).toEqual(before);
});

test('addto: feedback names the new and the old parent', () => {
  const session = Session.spec();
  session.create('g', 'markers');
  expect(session.run(new AddtoCommand(session.workspace, 'markers', 'bg'))).toEqual([
    'rect#bg moved into g#markers',
  ]);
  expect(session.undo()).toEqual(['rect#bg moved back into svg']);
});

test('front and back: feedback and undo', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  expect(session.run(new FrontCommand(session.workspace, 'bg'))).toEqual([
    'rect#bg brought to front',
  ]);
  expect(session.run(new BackCommand(session.workspace, 'box'))).toEqual(['rect#box sent to back']);
  expect(session.undo()).toEqual(['rect#box z-order restored']);
  expect(session.undo()).toEqual(['rect#bg z-order restored']);
  expect(session.fingerprint()).toEqual(before);
});
