import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/** The stdout of one run and the text of each file that the session saved, by file name. */
export interface TranscriptResult {
  readonly stdout: string;
  readonly files: Record<string, string>;
}

/**
 * TranscriptRunner runs a script of commands through a real entry point, like
 * `bun app/main.ts < doc/transcript/cli-1.txt`. Every run uses the same working folder, which it
 * empties and fills with the seed files first, so two runs see the same folder. Stdout stays in
 * memory and never lands in that folder.
 */
export class TranscriptRunner {
  static readonly #fixtures = join(import.meta.dir, '..', 'fixtures');
  /** The files that every session finds in its working folder. */
  static readonly #seeds = ['other.svg'];
  readonly #cwd: string;

  constructor(cwd: string) {
    this.#cwd = cwd;
  }

  async run(entry: string, args: string[], input: string): Promise<TranscriptResult> {
    rmSync(this.#cwd, { recursive: true, force: true });
    mkdirSync(this.#cwd, { recursive: true });
    for (const seed of TranscriptRunner.#seeds) {
      copyFileSync(join(TranscriptRunner.#fixtures, seed), join(this.#cwd, seed));
    }
    // Colours would make the bytes depend on the terminal, so the child gets none.
    const { FORCE_COLOR: _, ...env } = process.env;
    const child = Bun.spawn([process.execPath, entry, ...args], {
      cwd: this.#cwd,
      env: { ...env, NO_COLOR: '1' },
      stdin: new Blob([input]),
    });
    const stdout = await new Response(child.stdout).text();
    if ((await child.exited) !== 0) throw new Error(`${entry} exited with an error`);
    const saved = readdirSync(this.#cwd).filter((name) => !TranscriptRunner.#seeds.includes(name));
    const files = Object.fromEntries(
      saved.toSorted().map((name) => [name, readFileSync(join(this.#cwd, name), 'utf8')]),
    );
    return { stdout, files };
  }
}
