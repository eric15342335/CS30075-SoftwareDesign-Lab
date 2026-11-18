import { stripVTControlCharacters } from 'node:util';

/**
 * SpecTranscript is a REPL session as the spec prints it: prompt lines (`svg> command`), comment
 * lines and the program's output. It gives the input to replay and the lines to compare.
 */
export class SpecTranscript {
  readonly #text: string;

  constructor(text: string) {
    this.#text = text;
  }

  /** Returns what the user typed: the commands without the prompt, and the comment lines. */
  input(): string {
    return this.#text
      .split(/\r?\n/)
      .filter((line) => /^(?:svg> |#)/.test(line))
      .map((line) => line.replace(/^svg> /, ''))
      .join('\n');
  }

  /**
   * Returns the lines to compare. It drops the shell line, the banner and blank lines, and it
   * collapses runs of whitespace (spec gap 1).
   */
  lines(): string[] {
    return stripVTControlCharacters(this.#text)
      .split(/\r?\n/)
      .map((line) => line.trim().replaceAll(/\s+/g, ' '))
      .filter((line) => line !== '' && !line.startsWith('$ ') && !line.startsWith('svg-editor '));
  }
}
