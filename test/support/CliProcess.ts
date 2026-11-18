import { repo } from '#test/support/Paths.ts';

/** What one run of the program printed, and its exit code. */
export interface CliOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

/**
 * CliProcess runs an entry point in a new Bun process, as `bun app/main.ts < input` would. The
 * child gets no colours, so its output does not depend on the terminal.
 */
export class CliProcess {
  readonly #entry: string;

  constructor(entry = repo.main) {
    this.#entry = entry;
  }

  async run(args: string[], input: string, cwd = repo.root): Promise<CliOutput> {
    const { FORCE_COLOR: _, ...env } = process.env;
    const child = Bun.spawn([process.execPath, this.#entry, ...args], {
      cwd,
      env: { ...env, NO_COLOR: '1' },
      stdin: new Blob([input]),
      stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return { stdout, stderr, code };
  }
}
