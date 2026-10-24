/** A user mistake. The REPL prints it as `error: <message>`, and the document stays unchanged. */
export class EditorError extends Error {
  override readonly name = 'EditorError';
}
