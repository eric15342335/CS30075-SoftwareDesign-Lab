import { mkdtempDisposableSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * TempFolder is a new empty folder in the system temp folder. Declare it with `using`, and it is
 * deleted with everything in it when the block ends, also when the test fails.
 */
export class TempFolder implements Disposable {
  readonly #folder = mkdtempDisposableSync(join(tmpdir(), 'svg-test-'));

  get path(): string {
    return this.#folder.path;
  }

  /** Returns the path of a file or folder inside this folder. */
  file(...parts: string[]): string {
    return join(this.#folder.path, ...parts);
  }

  [Symbol.dispose](): void {
    this.#folder[Symbol.dispose]();
  }
}
