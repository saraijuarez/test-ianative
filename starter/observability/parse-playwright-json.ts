/**
 * Runtime validation of the Playwright JSON reporter output (verified against 1.64.1).
 *
 * Only the fields the normalizer uses are typed and checked. Unknown fields are ignored.
 * A TypeScript type is not validation: every field below is checked at runtime, and an
 * invalid file is rejected with the path of the first problem — never "fixed" or guessed.
 */

export type RawResult = {
  readonly retry: number;
  readonly status: string | undefined;
  readonly duration: number;
  readonly errors: readonly unknown[];
};

export type RawTest = {
  readonly projectName: string;
  readonly status: string;
  readonly expectedStatus: string;
  readonly results: readonly RawResult[];
};

export type RawSpec = {
  readonly id: string;
  readonly title: string;
  readonly file: string;
  readonly line: number;
  readonly tests: readonly RawTest[];
};

export type RawSuite = {
  readonly title: string;
  readonly file: string;
  readonly specs: readonly RawSpec[];
  readonly suites?: readonly RawSuite[];
};

export type RawProject = { readonly name: string; readonly retries: number; readonly repeatEach: number };

export type RawReport = {
  readonly config: {
    readonly version?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly projects: readonly RawProject[];
  };
  readonly suites: readonly RawSuite[];
  readonly errors: readonly unknown[];
  readonly stats: { readonly startTime: string; readonly duration: number } & Readonly<Record<string, unknown>>;
};

export type ParseResult = { readonly ok: true; readonly report: RawReport } | { readonly ok: false; readonly error: string };

class InvalidReport extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value)) throw new InvalidReport(`${path}: expected object`);
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new InvalidReport(`${path}: expected array`);
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new InvalidReport(`${path}: expected string`);
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new InvalidReport(`${path}: expected finite number`);
  return value;
}

function parseResult(value: unknown, path: string): RawResult {
  const o = requireObject(value, path);
  const status = o.status === undefined ? undefined : requireString(o.status, `${path}.status`);
  return {
    retry: requireNumber(o.retry, `${path}.retry`),
    status,
    duration: requireNumber(o.duration, `${path}.duration`),
    errors: o.errors === undefined ? [] : requireArray(o.errors, `${path}.errors`),
  };
}

function parseTest(value: unknown, path: string): RawTest {
  const o = requireObject(value, path);
  return {
    projectName: requireString(o.projectName, `${path}.projectName`),
    status: requireString(o.status, `${path}.status`),
    expectedStatus: requireString(o.expectedStatus, `${path}.expectedStatus`),
    results: requireArray(o.results, `${path}.results`).map((r, i) => parseResult(r, `${path}.results[${i}]`)),
  };
}

function parseSpec(value: unknown, path: string): RawSpec {
  const o = requireObject(value, path);
  return {
    id: requireString(o.id, `${path}.id`),
    title: requireString(o.title, `${path}.title`),
    file: requireString(o.file, `${path}.file`),
    line: requireNumber(o.line, `${path}.line`),
    tests: requireArray(o.tests, `${path}.tests`).map((t, i) => parseTest(t, `${path}.tests[${i}]`)),
  };
}

function parseSuite(value: unknown, path: string): RawSuite {
  const o = requireObject(value, path);
  return {
    title: requireString(o.title, `${path}.title`),
    file: requireString(o.file, `${path}.file`),
    specs: requireArray(o.specs, `${path}.specs`).map((s, i) => parseSpec(s, `${path}.specs[${i}]`)),
    suites:
      o.suites === undefined
        ? undefined
        : requireArray(o.suites, `${path}.suites`).map((s, i) => parseSuite(s, `${path}.suites[${i}]`)),
  };
}

function parseProject(value: unknown, path: string): RawProject {
  const o = requireObject(value, path);
  return {
    name: requireString(o.name, `${path}.name`),
    retries: requireNumber(o.retries, `${path}.retries`),
    repeatEach: requireNumber(o.repeatEach, `${path}.repeatEach`),
  };
}

/** Parses and validates the text of a Playwright JSON report. Never throws. */
export function parsePlaywrightJson(text: string): ParseResult {
  if (text.trim() === '') return { ok: false, error: 'empty file' };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `malformed JSON: ${(e as Error).message}` };
  }

  try {
    const root = requireObject(data, '$');
    const config = requireObject(root.config, '$.config');
    const stats = requireObject(root.stats, '$.stats');
    requireString(stats.startTime, '$.stats.startTime');
    requireNumber(stats.duration, '$.stats.duration');
    const report: RawReport = {
      config: {
        version: config.version === undefined ? undefined : requireString(config.version, '$.config.version'),
        metadata: config.metadata === undefined ? undefined : requireObject(config.metadata, '$.config.metadata'),
        projects: requireArray(config.projects, '$.config.projects').map((p, i) =>
          parseProject(p, `$.config.projects[${i}]`),
        ),
      },
      suites: requireArray(root.suites, '$.suites').map((s, i) => parseSuite(s, `$.suites[${i}]`)),
      errors: requireArray(root.errors, '$.errors'),
      stats: stats as RawReport['stats'],
    };
    return { ok: true, report };
  } catch (e) {
    if (e instanceof InvalidReport) return { ok: false, error: `invalid Playwright JSON report — ${e.message}` };
    throw e;
  }
}
