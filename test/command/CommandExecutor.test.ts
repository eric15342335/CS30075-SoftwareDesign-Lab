import { describe, expect, test } from 'bun:test';

import type { Command } from '#command/Command.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { CreateCommand } from '#command/CreateCommand.ts';
import { InitCommand } from '#command/InitCommand.ts';
import { RedoCommand } from '#command/RedoCommand.ts';
import { UndoCommand } from '#command/UndoCommand.ts';
import { Workspace } from '#command/Workspace.ts';
import { Decimal } from '#domain/Decimal.ts';

/** Creates a workspace and an executor, wired the same way as in the CLI. */
function editor() {
  const workspace = new Workspace();
  const executor = new CommandExecutor();
  const run = (command: Command): string[] => executor.execute(command);
  return {
    init: (width?: number, height?: number) =>
      run(
        new InitCommand(
          workspace,
          width === undefined ? undefined : new Decimal(width),
          height === undefined ? undefined : new Decimal(height),
        ),
      ),
    create: (type: string, id: string, args: string[] = [], containerId?: string) =>
      run(new CreateCommand(workspace, type, id, args, containerId)),
    undo: () => run(new UndoCommand(workspace, executor)),
    redo: () => run(new RedoCommand(workspace, executor)),
    ids: () =>
      workspace
        .document()
        .canvas.walk()
        .drop(1)
        .map((shape) => shape.id)
        .toArray(),
  };
}

const noDocument = "no document. use 'init' or 'read' first";
const ioBarrier = 'undo not allowed after io command';

describe('documents', () => {
  test('every command except init needs a document', () => {
    const { create, undo, redo } = editor();
    expect(() => create('g', 'g1')).toThrow(noDocument);
    expect(undo).toThrow(noDocument);
    expect(redo).toThrow(noDocument);
  });

  test('init creates the canvas, 800x600 by default', () => {
    const { init } = editor();
    expect(init()).toEqual(['canvas 800x600 created']);
    expect(init(400, 300)).toEqual(['canvas 400x300 created']);
  });

  test('a failed init keeps the current document', () => {
    const { init, create, ids } = editor();
    init();
    create('g', 'g1');
    expect(() => init(0, 300)).toThrow('canvas size must be positive');
    expect(ids()).toEqual(['g1']);
  });
});

describe('history', () => {
  test('a new executor has nothing to undo or redo', () => {
    const executor = new CommandExecutor();
    expect(() => executor.undo()).toThrow('nothing to undo');
    expect(() => executor.redo()).toThrow('nothing to redo');
  });

  test('undo and redo walk the history with the spec feedback', () => {
    const { init, create, undo, redo, ids } = editor();
    init();
    expect(create('g', 'g1')).toEqual(['g#g1 created']);
    expect(create('rect', 'r1', ['0', '0', '10', '10'], 'g1')).toEqual(['rect#r1 created in g#g1']);
    expect(undo()).toEqual(['rect#r1 removed']);
    expect(ids()).toEqual(['g1']);
    expect(redo()).toEqual(['rect#r1 created in g#g1']);
    expect(ids()).toEqual(['g1', 'r1']);
    undo();
    undo();
    expect(ids()).toEqual([]);
    expect(undo).toThrow('nothing to undo');
    redo();
    redo();
    expect(redo).toThrow('nothing to redo');
  });

  test('a new edit clears redo', () => {
    const { init, create, undo, redo } = editor();
    init();
    create('g', 'a');
    undo();
    create('g', 'b');
    expect(redo).toThrow('nothing to redo');
  });

  test('a failed command is not recorded', () => {
    const { init, create, undo, ids } = editor();
    init();
    create('g', 'a');
    expect(() => create('g', 'a')).toThrow('id already exists: a');
    expect(undo()).toEqual(['g#a removed']);
    expect(ids()).toEqual([]);
  });

  test('document commands block undo and redo until the next edit', () => {
    const { init, create, undo, redo } = editor();
    init();
    expect(undo).toThrow(ioBarrier);
    create('g', 'a');
    undo();
    init();
    expect(undo).toThrow(ioBarrier);
    expect(redo).toThrow(ioBarrier);
    create('g', 'b');
    expect(undo()).toEqual(['g#b removed']);
    expect(undo).toThrow('nothing to undo');
  });
});
