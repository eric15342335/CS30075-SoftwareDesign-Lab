import {
  DocumentSymbol,
  type DocumentSymbolProvider,
  Range,
  SymbolKind,
  type TextDocument,
} from 'vscode';

import { type OutlineElement, SvgOutline } from '#ext/SvgOutline.ts';

/**
 * SvgOutlineProvider is an adapter. VS Code expects a DocumentSymbolProvider, and SvgOutline gives
 * elements with offsets. This class converts each element into a DocumentSymbol with line and
 * column positions, so the native Outline view can show the SVG tree.
 */
export class SvgOutlineProvider implements DocumentSymbolProvider {
  readonly #outline = new SvgOutline();

  provideDocumentSymbols(document: TextDocument): DocumentSymbol[] {
    return this.#outline
      .elements(document.getText())
      .map((element) => this.#symbol(document, element));
  }

  #symbol(document: TextDocument, element: OutlineElement): DocumentSymbol {
    const kind = element.children.length > 0 ? SymbolKind.Namespace : SymbolKind.Field;
    const symbol = new DocumentSymbol(
      element.label,
      '',
      kind,
      new Range(document.positionAt(element.start), document.positionAt(element.end)),
      new Range(document.positionAt(element.nameStart), document.positionAt(element.nameEnd)),
    );
    symbol.children = element.children.map((child) => this.#symbol(document, child));
    return symbol;
  }
}
