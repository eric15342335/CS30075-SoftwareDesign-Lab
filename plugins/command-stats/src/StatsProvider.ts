import type { Command, CommandContext, CommandProvider } from '@svgframe/api';

import { ShapeStatistics } from './ShapeStatistics.ts';
import { StatsCommand } from './StatsCommand.ts';

/** Registers the `stats` command. It takes no arguments. */
export class StatsProvider implements CommandProvider {
  readonly name = 'stats';
  readonly syntax = '';
  readonly description = 'count the shapes by type';

  create(_args: readonly string[], context: CommandContext): Command {
    return new StatsCommand(new ShapeStatistics(context.workspace));
  }
}
