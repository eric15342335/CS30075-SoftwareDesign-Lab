/** The minimum prior state of one edit. Commands keep it opaque and only call restore() on undo. */
export interface Memento {
  restore(): void;
}
