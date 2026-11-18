import { join } from 'node:path';

/** Paths gives the absolute paths of the repository files that tests read or run. */
class Paths {
  readonly root: string;
  /** The CLI entry point, as `bun run cli` starts it. */
  readonly main: string;
  /** The mode B config file that the repository ships. */
  readonly shippedConfig: string;
  readonly transcripts: string;

  constructor(root: string) {
    this.root = root;
    this.main = join(root, 'app', 'main.ts');
    this.shippedConfig = join(root, 'plugins.config.json');
    this.transcripts = join(root, 'doc', 'transcript');
  }

  /** Returns the path of a file in `test/fixtures`, for example `fixture('configs', 'box.config.json')`. */
  fixture(...parts: string[]): string {
    return join(this.root, 'test', 'fixtures', ...parts);
  }
}

/** The paths of this repository. */
export const repo = new Paths(join(import.meta.dir, '..', '..'));
