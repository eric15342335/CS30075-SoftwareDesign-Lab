import { expect, test } from 'bun:test';

import { CliProgram } from '#cli/CliProgram.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { InitCommand } from '#command/InitCommand.ts';
import { ReadCommand } from '#command/ReadCommand.ts';
import { SaveCommand } from '#command/SaveCommand.ts';
import { UndoCommand } from '#command/UndoCommand.ts';
import { Workspace } from '#command/Workspace.ts';
import { RecordingObserver } from '#test/support/RecordingObserver.ts';
import { Session } from '#test/support/Session.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

test('observers hear init, save and read after each one succeeded, and not after a failure', () => {
  using folder = new TempFolder();
  const observer = new RecordingObserver('recorder');
  const workspace = new Workspace(Session.catalog(), [observer]);
  const executor = new CommandExecutor();
  const file = folder.file('a.svg');
  executor.execute(new InitCommand(workspace));
  executor.execute(new SaveCommand(workspace, file));
  executor.execute(new ReadCommand(workspace, file));
  expect(() => executor.execute(new ReadCommand(workspace, folder.file('missing.svg')))).toThrow();
  expect(() => executor.execute(new SaveCommand(workspace, folder.file('no', 'x.svg')))).toThrow();
  expect(observer.events).toEqual(['opened 0', 'saved 0', 'opened 0']);
});

test('a failing observer adds an error line, the next observer still runs, and the command counts', () => {
  using folder = new TempFolder();
  const healthy = new RecordingObserver('healthy');
  const workspace = new Workspace(Session.catalog(), [
    new RecordingObserver('broken', true),
    healthy,
  ]);
  const executor = new CommandExecutor();
  expect(executor.execute(new InitCommand(workspace))).toEqual([
    'canvas 800x600 created',
    'error: workspace observer failed: broken (broken on purpose)',
  ]);
  expect(healthy.events).toEqual(['opened 0']);
  // The init still happened, so the io barrier applies.
  expect(() => executor.execute(new UndoCommand(workspace, executor))).toThrow(
    'undo not allowed after io command',
  );
  // The error lines belong to that one command only.
  expect(executor.execute(new SaveCommand(workspace, folder.file('b.svg')))).toHaveLength(2);
  expect(workspace.observerErrors()).toEqual([]);
});

test('the observers registered in the extensions hear the workspace of the CLI', () => {
  const observer = new RecordingObserver('recorder');
  const extensions = Session.extensions();
  extensions.observers.add(observer);
  const workspace = new Workspace(extensions.catalog, extensions.observers.values());
  new CliProgram(workspace, new CommandExecutor(), extensions).run('init');
  expect(observer.events).toEqual(['opened 0']);
});
