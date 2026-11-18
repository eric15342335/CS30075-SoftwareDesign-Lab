import type { FileMetric } from '#scripts/metrics/FileMetric.ts';
import type { Role } from '#scripts/metrics/Role.ts';

type Measure = 'lines' | 'functions' | 'complexity';

/** The measured files of one git ref. */
export interface Snapshot {
  readonly ref: string;
  readonly commit: string;
  readonly files: FileMetric[];
}

/**
 * MetricsReport compares two snapshots and writes the report in Markdown (in Chinese, like
 * doc/README.md) and in JSON.
 */
export class MetricsReport {
  static readonly #roles: [Role, string][] = [
    ['kernel', '内核'],
    ['assembly', '装配处'],
    ['plugins', '插件'],
    ['vscode', 'VSCode 扩展'],
    ['scripts', '脚本'],
    ['tests', '测试'],
  ];
  readonly #from: Snapshot;
  readonly #to: Snapshot;

  constructor(from: Snapshot, to: Snapshot) {
    this.#from = from;
    this.#to = to;
  }

  json(): string {
    return `${JSON.stringify({ from: this.#from, to: this.#to }, null, 2)}\n`;
  }

  markdown(): string {
    const from = this.#from;
    const to = this.#to;
    return [
      `# 度量：${from.ref} → ${to.ref}`,
      '',
      `本文件由 \`bun scripts/metrics.ts --from ${from.ref} --to ${to.ref}\` 生成，请勿手改。` +
        `${from.ref} = \`${from.commit}\`，${to.ref} = \`${to.commit}\`。` +
        '行数只数非空行。圈复杂度由 oxlint 的 `eslint/complexity` 规则逐个单元给出（单元是函数、方法、访问器、构造器、箭头函数和类字段初始化器），再按文件和类别求和。',
      '',
      '## 按类别汇总',
      '',
      `| 类别 | 文件数 | 非空行 | 单元数 | 圈复杂度合计 |`,
      '| --- | --- | --- | --- | --- |',
      ...MetricsReport.#roles.map(([role, name]) => {
        const a = from.files.filter((file) => file.role === role);
        const b = to.files.filter((file) => file.role === role);
        const cell = (key: Measure): string =>
          MetricsReport.#change(MetricsReport.#sum(a, key), MetricsReport.#sum(b, key));
        return `| ${name} | ${MetricsReport.#change(a.length, b.length)} | ${cell('lines')} | ${cell('functions')} | ${cell('complexity')} |`;
      }),
      '',
      '## 圈复杂度增量（只列有变化的文件）',
      '',
      '| 文件 | 类别 | 之前 | 之后 | 增量 |',
      '| --- | --- | --- | --- | --- |',
      ...this.#deltas(),
      '',
      `## 文件清单与职责（${to.ref}）`,
      '',
      '| 文件 | 类别 | 非空行 | 圈复杂度 | 职责 |',
      '| --- | --- | --- | --- | --- |',
      ...to.files
        .filter((file) => file.role !== 'tests')
        .map(
          (file) =>
            `| \`${file.path}\` | ${MetricsReport.#name(file.role)} | ${file.lines} | ${file.complexity} | ${file.responsibility.replaceAll('|', '\\|')} |`,
        ),
      '',
      `## 测试文件（${to.ref}）`,
      '',
      '| 文件 | 非空行 |',
      '| --- | --- |',
      ...to.files
        .filter((file) => file.role === 'tests')
        .map((file) => `| \`${file.path}\` | ${file.lines} |`),
      '',
    ].join('\n');
  }

  /** One row for each file whose total complexity changed, also for added and deleted files. */
  #deltas(): string[] {
    const before = new Map(this.#from.files.map((file) => [file.path, file]));
    const after = new Map(this.#to.files.map((file) => [file.path, file]));
    const paths = [...new Set([...before.keys(), ...after.keys()])].toSorted();
    return paths.flatMap((path) => {
      const a = before.get(path);
      const b = after.get(path);
      const old = a?.complexity ?? 0;
      const now = b?.complexity ?? 0;
      if (old === now) return [];
      const role = MetricsReport.#name((b ?? a)?.role ?? 'tests');
      return [`| \`${path}\` | ${role} | ${old} | ${now} | ${MetricsReport.#signed(now - old)} |`];
    });
  }

  static #sum(files: FileMetric[], key: Measure): number {
    return files.reduce((total, file) => total + file[key], 0);
  }

  static #change(old: number, now: number): string {
    return `${old} → ${now} (${MetricsReport.#signed(now - old)})`;
  }

  static #signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }

  static #name(role: Role): string {
    return MetricsReport.#roles.find(([key]) => key === role)?.[1] ?? role;
  }
}
