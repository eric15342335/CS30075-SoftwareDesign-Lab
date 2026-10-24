/**
 * A memento holds the minimum state from before one edit. Commands do not look inside it. They
 * only call restore() on undo.
 */
export interface Memento {
  restore(): void;
}
