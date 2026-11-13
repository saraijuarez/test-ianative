/**
 * SYNTHETIC FIXTURES — for logic tests only. NOT real execution evidence.
 *
 * Builds raw Playwright JSON reports that mirror the shape produced by the real
 * reporter (verified against Playwright 1.64.1 output in results/playwright-results.json).
 * Every report carries `_synthetic` so it can never be mistaken for real history.
 */

export type SyntheticResult = {
  status: string;
  retry?: number;
  duration?: number;
  errors?: { message: string }[];
  stdout?: { text: string }[];
};

export type SyntheticTest = {
  title: string;
  project?: string;
  status: string;
  results: SyntheticResult[];
  file?: string;
  describe?: string;
};

export type SyntheticOptions = {
  tests: SyntheticTest[];
  projects?: { name: string; retries: number }[];
  metadata?: Record<string, string>;
  errors?: unknown[];
  startTime?: string;
  duration?: number;
};

export function syntheticReport(opts: SyntheticOptions): Record<string, unknown> {
  const projects = opts.projects ?? [{ name: 'chromium', retries: 0 }];
  const byFile = new Map<string, SyntheticTest[]>();
  for (const t of opts.tests) {
    const file = t.file ?? 'synthetic.spec.ts';
    byFile.set(file, [...(byFile.get(file) ?? []), t]);
  }

  const spec = (t: SyntheticTest, i: number) => ({
    title: t.title,
    ok: t.status !== 'unexpected',
    tags: [],
    id: `synthetic-${i}`,
    file: t.file ?? 'synthetic.spec.ts',
    line: 10 + i,
    column: 5,
    tests: [
      {
        timeout: 30000,
        annotations: [],
        expectedStatus: 'passed',
        projectId: t.project ?? 'chromium',
        projectName: t.project ?? 'chromium',
        status: t.status,
        results: t.results.map((r, k) => ({
          workerIndex: 0,
          parallelIndex: 0,
          status: r.status,
          duration: r.duration ?? 100,
          errors: r.errors ?? [],
          stdout: r.stdout ?? [],
          stderr: [],
          retry: r.retry ?? k,
          startTime: '2026-01-01T00:00:00.000Z',
          annotations: [],
          attachments: [],
        })),
      },
    ],
  });

  let index = 0;
  const suites = [...byFile.entries()].map(([file, tests]) => {
    const plain = tests.filter((t) => !t.describe).map((t) => spec(t, index++));
    const describes = [...new Set(tests.filter((t) => t.describe).map((t) => t.describe as string))];
    return {
      title: file,
      file,
      column: 0,
      line: 0,
      specs: plain,
      suites: describes.map((d) => ({
        title: d,
        file,
        column: 0,
        line: 1,
        specs: tests.filter((t) => t.describe === d).map((t) => spec(t, index++)),
      })),
    };
  });

  return {
    _synthetic: 'SYNTHETIC FIXTURE — logic tests only, not real evidence',
    config: {
      version: '1.64.1',
      metadata: opts.metadata ?? {},
      projects: projects.map((p) => ({ ...p, id: p.name, repeatEach: 1, outputDir: '', metadata: {}, testDir: '', testIgnore: [], testMatch: [], timeout: 30000 })),
    },
    suites,
    errors: opts.errors ?? [],
    stats: {
      startTime: opts.startTime ?? '2026-01-01T00:00:00.000Z',
      duration: opts.duration ?? 1000,
      expected: opts.tests.filter((t) => t.status === 'expected').length,
      unexpected: opts.tests.filter((t) => t.status === 'unexpected').length,
      flaky: opts.tests.filter((t) => t.status === 'flaky').length,
      skipped: opts.tests.filter((t) => t.status === 'skipped').length,
    },
  };
}

export const passed = (title: string, extra: Partial<SyntheticTest> = {}): SyntheticTest => ({
  title,
  status: 'expected',
  results: [{ status: 'passed' }],
  ...extra,
});
export const failed = (title: string, extra: Partial<SyntheticTest> = {}): SyntheticTest => ({
  title,
  status: 'unexpected',
  results: [{ status: 'failed', errors: [{ message: 'boom' }] }],
  ...extra,
});
export const skipped = (title: string, extra: Partial<SyntheticTest> = {}): SyntheticTest => ({
  title,
  status: 'skipped',
  results: [{ status: 'skipped' }],
  ...extra,
});
