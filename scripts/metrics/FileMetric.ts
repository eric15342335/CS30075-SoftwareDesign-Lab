import type { Role } from '#scripts/metrics/Role.ts';

/** What the metrics know about one file of one tree. */
export interface FileMetric {
  readonly path: string;
  readonly role: Role;
  /** Lines that are not blank. */
  readonly lines: number;
  /**
   * The number of units that oxlint measures: functions, methods, accessors, constructors, arrow
   * functions and class field initializers.
   */
  readonly functions: number;
  /** The sum of the cyclomatic complexity of the function units. */
  readonly complexity: number;
  /** One sentence on the file's job. Test files and files of the older tree have none. */
  readonly responsibility: string;
}
