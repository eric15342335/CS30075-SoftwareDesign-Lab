import type { Shape, SvgDocument, TreeDecorator, WorkspaceObserver } from '@svgframe/api';

/**
 * ModifiedStar adds "*" to a row of `tree` when the shape changed since the document was last
 * opened or saved (ADR 3). It compares content fingerprints, so an undo back to the saved state
 * clears the star. The fingerprints are for comparison only; they are not undo snapshots.
 *
 * A shape row compares its type, parent id, attributes and text. The canvas row compares the
 * canvas attributes and the ids in document order, so it also marks deletes and reorders. A new
 * shape has no saved fingerprint, so it gets the star at once. Ancestors are not marked.
 */
export class ModifiedStar implements TreeDecorator, WorkspaceObserver {
  readonly name = 'modified-star';
  #saved = new Map<string, string>();
  #savedRoot: string | undefined;

  opened(document: SvgDocument): void {
    this.#remember(document);
  }

  saved(document: SvgDocument): void {
    this.#remember(document);
  }

  label(shape: Shape): string | undefined {
    const changed =
      shape.parent === null
        ? ModifiedStar.#root(shape) !== this.#savedRoot
        : ModifiedStar.#print(shape) !== this.#saved.get(shape.id);
    return changed ? '*' : undefined;
  }

  #remember(document: SvgDocument): void {
    const canvas = document.canvas;
    this.#savedRoot = ModifiedStar.#root(canvas);
    this.#saved = new Map(
      canvas
        .walk()
        .drop(1)
        .map((shape) => [shape.id, ModifiedStar.#print(shape)]),
    );
  }

  static #print(shape: Shape): string {
    return JSON.stringify([shape.type, shape.parent?.id, shape.attributes(), shape.textContent()]);
  }

  static #root(canvas: Shape): string {
    const ids = canvas
      .walk()
      .drop(1)
      .map((shape) => shape.id)
      .toArray();
    return JSON.stringify([canvas.attributes(), ids]);
  }
}
