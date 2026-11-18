import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { CliProcess } from '#test/support/CliProcess.ts';
import { repo } from '#test/support/Paths.ts';

/** The stdout of one run and the text of each file that the session saved, by file name. */
export interface TranscriptResult {
  readonly stdout: string;
  readonly files: Record<string, string>;
}

/**
 * TranscriptRunner runs a script of commands through a real entry point, like
 * `bun app/main.ts < doc/transcript/cli-1.txt`. Every run uses the same working folder, which it
 * empties and fills with the seed files first, so two runs see the same folder (spec §5: the two
 * assemblies run in the same directory). Stdout stays in memory and never lands in that folder.
 */
export class TranscriptRunner {
  /** The files that every session finds in its working folder. */
  static readonly #seeds = ['other.svg'];
  readonly #cwd: string;
  readonly #process: CliProcess;

  constructor(cwd: string, entry = repo.main) {
    this.#cwd = cwd;
    this.#process = new CliProcess(entry);
  }

  async run(args: string[], input: string): Promise<TranscriptResult> {
    rmSync(this.#cwd, { recursive: true, force: true });
    mkdirSync(this.#cwd, { recursive: true });
    for (const seed of TranscriptRunner.#seeds) {
      copyFileSync(repo.fixture(seed), join(this.#cwd, seed));
    }
    const { stdout, code } = await this.#process.run(args, input, this.#cwd);
    if (code !== 0) throw new Error(`the program exited with code ${code}`);
    const saved = readdirSync(this.#cwd).filter((name) => !TranscriptRunner.#seeds.includes(name));
    const files = Object.fromEntries(
      saved.toSorted().map((name) => [name, readFileSync(join(this.#cwd, name), 'utf8')]),
    );
    return { stdout, files };
  }
}
