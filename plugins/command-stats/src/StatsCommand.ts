import { Command } from '@svgframe/api';

import type { ShapeStatistics } from './ShapeStatistics.ts';

/**
 * StatsCommand forwards `stats` to its receiver. It changes nothing, so it keeps the default of
 * Command and stays out of the history.
 */
export class StatsCommand extends Command {
  readonly #statistics: ShapeStatistics;

  constructor(statistics: ShapeStatistics) {
    super();
    this.#statistics = statistics;
  }

  override execute(): string[] {
    return [this.#statistics.summary()];
  }
}
