import { copyFileSync, readFileSync, readdirSync } from 'node:fs';

import { CliProcess } from '#test/support/CliProcess.ts';
import { repo } from '#test/support/Paths.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

/** The stdout of one run and the text of each file that the session saved, by file name. */
export interface TranscriptResult {
  readonly stdout: string;
  readonly files: Record<string, string>;
}

/**
 * TranscriptRunner runs a script of commands through a real entry point, like
 * `bun app/main.ts < doc/transcript/cli-1.txt`. Each run gets a new working folder that holds
 * only the seed files, and it returns the files that the session saved there.
 */
export class TranscriptRunner {
  /** The files that every session finds in its working folder. */
  static readonly #seeds = ['other.svg'];
  readonly #process: CliProcess;

  constructor(entry = repo.main) {
    this.#process = new CliProcess(entry);
  }

  async run(args: string[], input: string): Promise<TranscriptResult> {
    using folder = new TempFolder();
    for (const seed of TranscriptRunner.#seeds) copyFileSync(repo.fixture(seed), folder.file(seed));
    const { stdout, code } = await this.#process.run(args, input, folder.path);
    if (code !== 0) throw new Error(`the program exited with code ${code}`);
    const saved = readdirSync(folder.path).filter(
      (name) => !TranscriptRunner.#seeds.includes(name),
    );
    const files = Object.fromEntries(
      saved.toSorted().map((name) => [name, readFileSync(folder.file(name), 'utf8')]),
    );
    return { stdout, files };
  }
}
