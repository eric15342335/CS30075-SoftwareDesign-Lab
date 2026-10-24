import type { Command } from '#command/Command.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { CreateCommand } from '#command/CreateCommand.ts';
import { InitCommand } from '#command/InitCommand.ts';
import { RedoCommand } from '#command/RedoCommand.ts';
import { UndoCommand } from '#command/UndoCommand.ts';
import { Workspace } from '#command/Workspace.ts';
import type { SvgDocument } from '#domain/SvgDocument.ts';

/** A workspace and executor wired the way the CLI wires them, for command-level tests. */
export class Session {
  readonly workspace = new Workspace();
  readonly executor = new CommandExecutor();

  /** The spec's section 6 document just before `group markers c1 box`; history holds the creates. */
  static spec(): Session {
    const session = new Session();
    session.run(new InitCommand(session.workspace));
    session.create('rect', 'bg', ['0', '0', '800', '600', '#ffffff']);
    session.create('text', 'title', ['20', '40', 'My Diagram']);
    session.create('circle', 'c1', ['100', '100', '20', 'red']);
    session.create('rect', 'box', ['200', '80', '60', '60', '#3366ff']);
    return session;
  }

  run(command: Command): string[] {
    return this.executor.execute(command);
  }

  create(type: string, id: string, args: string[] = [], containerId?: string): string[] {
    return this.run(new CreateCommand(this.workspace, type, id, args, containerId));
  }

  undo(): string[] {
    return this.run(new UndoCommand(this.workspace, this.executor));
  }

  redo(): string[] {
    return this.run(new RedoCommand(this.workspace, this.executor));
  }

  document(): SvgDocument {
    return this.workspace.document();
  }

  /** Every shape with its parent, attributes and text: equal fingerprints mean equal saved files. */
  fingerprint(): string[] {
    return this.document()
      .canvas.walk()
      .map((shape) =>
        JSON.stringify([shape.parent?.id, shape.label(), shape.attributes(), shape.textContent()]),
      )
      .toArray();
  }
}
