import type { SvgDocument } from '#domain/SvgDocument.ts';

/**
 * An observer of the workspace (Observer pattern, push model). The workspace calls it after a
 * document was opened by init or read, and after a document was saved. A plugin such as
 * modified-star uses these events to remember the saved state.
 */
export interface WorkspaceObserver {
  /** A name for error messages, such as the name of the plugin. */
  readonly name: string;
  opened(document: SvgDocument): void;
  saved(document: SvgDocument): void;
}
