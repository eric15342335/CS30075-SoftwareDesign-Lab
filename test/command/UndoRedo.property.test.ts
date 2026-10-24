import { expect, test } from 'bun:test';

import * as fc from 'fast-check';

import { AddtoCommand } from '#command/AddtoCommand.ts';
import { BackCommand } from '#command/BackCommand.ts';
import type { Command } from '#command/Command.ts';
import { CreateCommand } from '#command/CreateCommand.ts';
import { DeleteCommand } from '#command/DeleteCommand.ts';
import { FrontCommand } from '#command/FrontCommand.ts';
import { GroupCommand } from '#command/GroupCommand.ts';
import { MoveCommand } from '#command/MoveCommand.ts';
import { ScaleCommand } from '#command/ScaleCommand.ts';
import { SetCommand } from '#command/SetCommand.ts';
import { UngroupCommand } from '#command/UngroupCommand.ts';
import type { Workspace } from '#command/Workspace.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Session } from '#test/support/Session.ts';

type Edit = (workspace: Workspace) => Command;

// These are the ids of the start document plus some new ones, so the edits hit leaves,
// containers and unused ids.
const id = fc.constantFrom('bg', 'title', 'c1', 'box', 'markers', 'inner', 'deep', 'g1', 'r1');
const delta = fc.integer({ min: -100, max: 100 }).map((value) => new Decimal(value));
const created = fc.constantFrom<readonly [string, readonly string[]]>(
  ['rect', ['1', '2', '30', '40', 'red']],
  ['circle', ['5', '6', '7']],
  ['ellipse', ['5', '6', '7', '8']],
  ['line', ['0', '0', '9', '9', 'black']],
  ['text', ['1', '2', 'hi']],
  ['g', []],
);

const edit: fc.Arbitrary<Edit> = fc.oneof(
  fc.tuple(created, id, fc.option(id, { nil: undefined, freq: 2 })).map(
    ([[type, args], shapeId, containerId]) =>
      (workspace: Workspace) =>
        new CreateCommand(workspace, type, shapeId, args, containerId),
  ),
  id.map((shapeId) => (workspace: Workspace) => new DeleteCommand(workspace, shapeId)),
  fc.tuple(id, delta, delta).map(
    ([shapeId, dx, dy]) =>
      (workspace: Workspace) =>
        new MoveCommand(workspace, shapeId, dx, dy),
  ),
  fc.tuple(id, fc.constantFrom(0, 0.1, 0.5, 2, 3)).map(
    ([shapeId, factor]) =>
      (workspace: Workspace) =>
        new ScaleCommand(workspace, shapeId, new Decimal(factor)),
  ),
  fc
    .tuple(
      id,
      fc.constantFrom('fill', 'stroke', 'x', 'r', 'text', 'width'),
      fc.constantFrom('red', '7', '-1', 'abc'),
    )
    .map(
      ([shapeId, name, value]) =>
        (workspace: Workspace) =>
          new SetCommand(workspace, shapeId, name, value),
    ),
  fc.tuple(id, fc.array(id, { minLength: 1, maxLength: 4 })).map(
    ([groupId, memberIds]) =>
      (workspace: Workspace) =>
        new GroupCommand(workspace, groupId, memberIds),
  ),
  id.map((groupId) => (workspace: Workspace) => new UngroupCommand(workspace, groupId)),
  fc.tuple(id, id).map(
    ([groupId, shapeId]) =>
      (workspace: Workspace) =>
        new AddtoCommand(workspace, groupId, shapeId),
  ),
  id.map((shapeId) => (workspace: Workspace) => new FrontCommand(workspace, shapeId)),
  id.map((shapeId) => (workspace: Workspace) => new BackCommand(workspace, shapeId)),
);

/** The spec session plus a nested group, so that ungroup and addto have targets from the start. */
function start(): Session {
  const session = Session.spec();
  session.run(new GroupCommand(session.workspace, 'markers', ['c1', 'box']));
  session.create('g', 'inner', [], 'markers');
  session.create('rect', 'deep', ['1', '1', '2', '2'], 'inner');
  return session;
}

test('random edits: failures change nothing, undo walks back every state, redo walks forward', () => {
  fc.assert(
    fc.property(fc.array(edit, { maxLength: 30 }), (edits) => {
      const session = start();
      const states = [session.fingerprint()];
      for (const makeEdit of edits) {
        try {
          session.run(makeEdit(session.workspace));
          states.push(session.fingerprint());
        } catch (error) {
          if (!(error instanceof EditorError)) throw error;
          expect(session.fingerprint()).toEqual(states.at(-1) ?? []);
        }
      }
      for (const expected of states.toReversed().slice(1)) {
        session.undo();
        expect(session.fingerprint()).toEqual(expected);
      }
      for (const expected of states.slice(1)) {
        session.redo();
        expect(session.fingerprint()).toEqual(expected);
      }
    }),
    { numRuns: 500 },
  );
});
