/** One direct child of a directory, as the listing needs it. */
export interface DirectoryEntry {
  readonly name: string;
  /** True for a directory. Files, symbolic links and other special items are false. */
  readonly directory: boolean;
}
