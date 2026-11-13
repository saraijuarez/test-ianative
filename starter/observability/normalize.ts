/**
 * Converts a validated Playwright JSON report into the normalized contract.
 * Pure function: no clock, network or filesystem access.
 */
import {
  SCHEMA_VERSION,
  type Attempt,
  type CiContext,
  type CompletenessState,
  type NormalizedRun,
  type NormalizedTest,
  type Outcome,
  type OutcomeCounts,
} from './contract.ts';
import type { RawReport, RawSuite, RawTest } from './parse-playwright-json.ts';

export type RawFileInfo = {
  /** Relative path of the raw file, forward slashes. */
  readonly rawFile: string;
  readonly rawSha256: string;
};

/**
 * Logical outcome from Playwright's per-test `status` (1.64.1 semantics):
 *   expected → passed (includes test.fail() that failed as expected)
 *   unexpected → failed, flaky → flaky (failed, then passed on retry), skipped → skipped.
 * Anything else is 'unknown' — never promoted to 'passed'.
 */
export function toOutcome(status: string): Outcome {
  switch (status) {
    case 'expected':
      return 'passed';
    case 'unexpected':
      return 'failed';
    case 'flaky':
      return 'flaky';
    case 'skipped':
      return 'skipped';
    default:
      return 'unknown';
  }
}

function metadataString(metadata: Readonly<Record<string, unknown>> | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** GitHub Actions context, only when GITHUB_RUN_ID was captured. */
export function toCiContext(metadata: Readonly<Record<string, unknown>> | undefined): CiContext | null {
  const runId = metadataString(metadata, 'GITHUB_RUN_ID');
  if (runId === null) return null;
  const server = metadataString(metadata, 'GITHUB_SERVER_URL');
  const repository = metadataString(metadata, 'GITHUB_REPOSITORY');
  return {
    provider: 'github-actions',
    runId,
    runAttempt: metadataString(metadata, 'GITHUB_RUN_ATTEMPT'),
    sha: metadataString(metadata, 'GITHUB_SHA'),
    ref: metadataString(metadata, 'GITHUB_REF_NAME'),
    workflow: metadataString(metadata, 'GITHUB_WORKFLOW'),
    event: metadataString(metadata, 'GITHUB_EVENT_NAME'),
    runUrl: server && repository ? `${server}/${repository}/actions/runs/${runId}` : null,
  };
}

export function countOutcomes(tests: readonly { readonly outcome: Outcome }[]): OutcomeCounts {
  const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0, unknown: 0 };
  for (const t of tests) counts[t.outcome] += 1;
  return { ...counts, total: tests.length };
}

function toAttempts(test: RawTest): Attempt[] {
  return test.results.map((r) => ({
    retry: r.retry,
    status: r.status ?? 'unknown',
    durationMs: r.duration,
    errorCount: r.errors.length,
  }));
}

type Collected = { test: RawTest; specId: string; file: string; line: number; titlePath: string[] };

/** Walks suites. Root suites are files (their title is a platform path), so it is not part of the title path. */
function collect(suites: readonly RawSuite[], describePath: string[], isRoot: boolean, out: Collected[]): void {
  for (const suite of suites) {
    const path = isRoot ? describePath : [...describePath, suite.title];
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        out.push({
          test,
          specId: spec.id,
          file: spec.file.replaceAll('\\', '/'),
          line: spec.line,
          titlePath: [...path, spec.title],
        });
      }
    }
    if (suite.suites) collect(suite.suites, path, false, out);
  }
}

export function normalizeRun(report: RawReport, raw: RawFileInfo): NormalizedRun {
  const collected: Collected[] = [];
  collect(report.suites, [], true, collected);

  const warnings: string[] = [];
  const reasons: string[] = [];
  const seenKeys = new Map<string, number>();

  const tests: NormalizedTest[] = collected.map(({ test, specId, file, line, titlePath }) => {
    const baseKey = `${test.projectName}::${file}::${titlePath.join(' > ')}`;
    const seen = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, seen + 1);
    const testKey = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;
    if (seen === 1) warnings.push(`testKey collision (repeatEach or duplicate title): ${baseKey}`);

    const attempts = toAttempts(test);
    const mapped = toOutcome(test.status);
    // A non-skipped test without any attempt never actually ran: it is unknown, never passed.
    const neverRan = mapped !== 'skipped' && attempts.length === 0;
    const outcome: Outcome = neverRan ? 'unknown' : mapped;
    if (mapped === 'unknown') reasons.push(`unknown status "${test.status}" for ${testKey}`);
    if (neverRan) reasons.push(`no attempts recorded for ${testKey}`);
    if (attempts.some((a) => a.status === 'interrupted')) reasons.push(`interrupted attempt in ${testKey}`);

    return {
      testKey,
      project: test.projectName,
      file,
      titlePath,
      line,
      outcome,
      expectedStatus: test.expectedStatus,
      attempts,
      durationMs: attempts.reduce((sum, a) => sum + a.durationMs, 0),
      finalAttemptDurationMs: attempts.length > 0 ? attempts[attempts.length - 1].durationMs : null,
      evidence: { rawFile: raw.rawFile, specId },
    };
  });

  if (report.errors.length > 0) reasons.push(`${report.errors.length} global error(s) reported by Playwright`);
  if (tests.length === 0) reasons.push('report contains no tests');

  const summary = countOutcomes(tests);

  // Cross-check against Playwright's own stats when present; a mismatch is a data-quality warning.
  const stats = report.stats;
  const expected = { expected: summary.passed, unexpected: summary.failed, flaky: summary.flaky, skipped: summary.skipped };
  for (const [key, value] of Object.entries(expected)) {
    if (typeof stats[key] === 'number' && stats[key] !== value) {
      warnings.push(`stats.${key}=${String(stats[key])} differs from normalized count ${value}`);
    }
  }

  const state: CompletenessState = tests.length === 0 ? 'unknown' : reasons.length > 0 ? 'partial' : 'complete';
  const ci = toCiContext(report.config.metadata);

  return {
    schemaVersion: SCHEMA_VERSION,
    runKey: ci ? `gha:${ci.runId}:${ci.runAttempt ?? 'unknown'}` : `local:${raw.rawSha256}`,
    source: {
      kind: 'playwright-json',
      playwrightVersion: report.config.version ?? null,
      rawFile: raw.rawFile,
      rawSha256: raw.rawSha256,
    },
    execution: {
      startTime: report.stats.startTime,
      durationMs: report.stats.duration,
      ci,
      provenance: { startTime: 'playwright-json', durationMs: 'playwright-json', ci: ci ? 'ci-metadata' : null },
    },
    config: {
      projects: report.config.projects.map((p) => ({ name: p.name, retries: p.retries, repeatEach: p.repeatEach })),
    },
    completeness: { state, reasons },
    summary,
    warnings,
    tests,
  };
}
