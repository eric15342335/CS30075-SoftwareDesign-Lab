import { SyntaxValidator } from 'fast-xml-validator';
import { Parser } from 'htmlparser2';

/**
 * One element in the outline. The offsets count UTF-16 code units, the same way as the offsets of
 * a VS Code document.
 */
export interface OutlineElement {
  /** The tag name, or the tag name and the id joined by "#". */
  readonly label: string;
  /** The offset of the "<" that opens the element. */
  readonly start: number;
  /** The offset right after the ">" that closes the element. */
  end: number;
  /** The offsets of the tag name. The editor selects this part when the user clicks the element. */
  readonly nameStart: number;
  readonly nameEnd: number;
  readonly children: OutlineElement[];
}

/**
 * SvgOutline turns SVG text into a tree of elements with their source offsets. It needs no VS Code
 * API, so the Bun tests can check it directly.
 */
export class SvgOutline {
  /** Returns the top-level elements. Text that is not well-formed XML gives an empty outline. */
  elements(text: string): OutlineElement[] {
    if (!this.#wellFormed(text)) return [];
    const roots: OutlineElement[] = [];
    const open: OutlineElement[] = [];
    const parser = new Parser(
      {
        onopentag: (name, attributes) => {
          const start = parser.startIndex;
          const id = attributes['id'];
          const element: OutlineElement = {
            label: id ? `${name}#${id}` : name,
            start,
            end: start,
            nameStart: start + 1,
            nameEnd: start + 1 + name.length,
            children: [],
          };
          (open.at(-1)?.children ?? roots).push(element);
          open.push(element);
        },
        onclosetag: () => {
          const element = open.pop();
          // The parser's endIndex points at the closing ">" itself, so the element ends one later.
          if (element !== undefined) element.end = parser.endIndex + 1;
        },
      },
      { xmlMode: true },
    );
    parser.end(text);
    return roots;
  }

  #wellFormed(text: string): boolean {
    try {
      SyntaxValidator.validate(text);
      return true;
    } catch {
      return false;
    }
  }
}
