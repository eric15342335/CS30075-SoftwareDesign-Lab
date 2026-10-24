/**
 * An EditorError reports a mistake by the user. The REPL prints it as `error: <message>`, and the
 * document stays unchanged.
 */
export class EditorError extends Error {
  override readonly name = 'EditorError';
}
