/**
 * Tells the host where one plugin comes from. Both functions return what `import()` returns. The
 * host calls them only when it installs the plugin, so a broken package fails inside the host.
 */
export interface PluginSource {
  /** The package name or path that the user wrote. Error messages use it. */
  readonly module: string;
  /** The `options` of the config entry. The plugin reads them from its context. */
  readonly options?: Readonly<Record<string, unknown>>;
  /** Imports the package's package.json. */
  manifest(): Promise<unknown>;
  /** Imports the package's entry module. */
  load(): Promise<unknown>;
}
