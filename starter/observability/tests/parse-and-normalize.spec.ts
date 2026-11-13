// Logic tests with SYNTHETIC fixtures (see synthetic-report.ts). Not real evidence.
import { test, expect } from '@playwright/test';
import { normalizeRun } from '../normalize.ts';
import { parsePlaywrightJson, type RawReport } from '../parse-playwright-json.ts';
import { failed, passed, skipped, syntheticReport, type SyntheticOptions } from './synthetic-report.ts';

const RAW = { rawFile: 'results/synthetic.json', rawSha256: 'a'.repeat(64) };

function normalize(opts: SyntheticOptions) {
  const parsed = parsePlaywrightJson(JSON.stringify(syntheticReport(opts)));
  if (!parsed.ok) throw new Error(parsed.error);
  return normalizeRun(parsed.report, RAW);
}

test.describe('parsePlaywrightJson', () => {
  test('rejects an empty file', () => {
    expect(parsePlaywrightJson('   ')).toEqual({ ok: false, error: 'empty file' });
  });

  test('rejects malformed JSON', () => {
    const result = parsePlaywrightJson('{"config": ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^malformed JSON/);
  });

  test('rejects invalid fields with the path of the problem', () => {
    const report = syntheticReport({ tests: [passed('a')] }) as { suites: { specs: { tests: { results: { duration: unknown }[] }[] }[] }[] };
    report.suites[0].specs[0].tests[0].results[0].duration = 'slow';
    const result = parsePlaywrightJson(JSON.stringify(report));
    expect(result).toEqual({
      ok: false,
      error: 'invalid Playwright JSON report — $.suites[0].specs[0].tests[0].results[0].duration: expected finite number',
    });
  });

  test('rejects a report without stats', () => {
    const { stats: _omit, ...withoutStats } = syntheticReport({ tests: [passed('a')] });
    const result = parsePlaywrightJson(JSON.stringify(withoutStats));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('$.stats: expected object');
  });
});

test.describe('normalizeRun', () => {
  test('maps passed and failed tests to logical outcomes', () => {
    const run = normalize({ tests: [passed('a'), failed('b')] });
    expect(run.summary).toEqual({ passed: 1, failed: 1, flaky: 0, skipped: 0, unknown: 0, total: 2 });
    expect(run.completeness).toEqual({ state: 'complete', reasons: [] });
    expect(run.schemaVersion).toBe('1.0.0');
    expect(run.runKey).toBe(`local:${RAW.rawSha256}`);
  });

  test('keeps skipped separate', () => {
    const run = normalize({ tests: [passed('a'), skipped('b')] });
    expect(run.summary.skipped).toBe(1);
    expect(run.summary.passed).toBe(1);
  });

  test('counts a failure followed by a passing retry as ONE flaky test with two attempts', () => {
    const run = normalize({
      projects: [{ name: 'chromium', retries: 2 }],
      tests: [{ title: 'retry me', status: 'flaky', results: [{ status: 'failed', retry: 0 }, { status: 'passed', retry: 1 }] }],
    });
    expect(run.summary).toEqual({ passed: 0, failed: 0, flaky: 1, skipped: 0, unknown: 0, total: 1 });
    expect(run.tests).toHaveLength(1);
    expect(run.tests[0].attempts.map((a) => `${a.status}@${a.retry}`)).toEqual(['failed@0', 'passed@1']);
    expect(run.tests[0].durationMs).toBe(200);
    expect(run.tests[0].finalAttemptDurationMs).toBe(100);
  });

  test('marks an interrupted run as partial and never counts unknown as passed', () => {
    const run = normalize({
      errors: [{ message: 'Test run was interrupted' }],
      tests: [
        { title: 'cut', status: 'unexpected', results: [{ status: 'interrupted' }] },
        { title: 'never ran', status: 'expected', results: [] },
        { title: 'weird', status: 'something-new', results: [{ status: 'passed' }] },
      ],
    });
    expect(run.completeness.state).toBe('partial');
    expect(run.completeness.reasons).toEqual([
      'interrupted attempt in chromium::synthetic.spec.ts::cut',
      'no attempts recorded for chromium::synthetic.spec.ts::never ran',
      'unknown status "something-new" for chromium::synthetic.spec.ts::weird',
      '1 global error(s) reported by Playwright',
    ]);
    // "never ran" reports status "expected" but has no attempts → unknown, not passed.
    expect(run.summary).toEqual({ passed: 0, failed: 1, flaky: 0, skipped: 0, unknown: 2, total: 3 });
  });

  test('marks a report with no tests as unknown completeness', () => {
    const run = normalize({ tests: [] });
    expect(run.completeness.state).toBe('unknown');
  });

  test('keeps identical titles in different projects as distinct tests', () => {
    const run = normalize({
      projects: [{ name: 'chromium', retries: 0 }, { name: 'firefox', retries: 0 }],
      tests: [passed('login', { project: 'chromium', describe: 'Shop' }), failed('login', { project: 'firefox', describe: 'Shop' })],
    });
    expect(run.tests.map((t) => [t.testKey, t.outcome])).toEqual([
      ['chromium::synthetic.spec.ts::Shop > login', 'passed'],
      ['firefox::synthetic.spec.ts::Shop > login', 'failed'],
    ]);
    expect(run.warnings).toEqual([]);
  });

  test('flags a key collision instead of merging duplicates', () => {
    const run = normalize({ tests: [passed('same'), passed('same')] });
    expect(run.tests.map((t) => t.testKey)).toEqual(['chromium::synthetic.spec.ts::same', 'chromium::synthetic.spec.ts::same#2']);
    expect(run.warnings).toContain('testKey collision (repeatEach or duplicate title): chromium::synthetic.spec.ts::same');
  });

  test('builds CI identity only from captured metadata', () => {
    const run = normalize({
      tests: [passed('a')],
      metadata: {
        GITHUB_RUN_ID: '42',
        GITHUB_RUN_ATTEMPT: '2',
        GITHUB_SHA: 'abc1234def',
        GITHUB_SERVER_URL: 'https://github.example',
        GITHUB_REPOSITORY: 'org/repo',
      },
    });
    expect(run.runKey).toBe('gha:42:2');
    expect(run.execution.ci?.runUrl).toBe('https://github.example/org/repo/actions/runs/42');
    expect(run.execution.ci?.ref).toBeNull();
    expect(run.execution.provenance.ci).toBe('ci-metadata');
  });

  test('does not expose sensitive content from stdout or error messages', () => {
    const secret = 'SYNTHETIC-SECRET-TOKEN-123';
    const run = normalize({
      tests: [
        {
          title: 'leaky',
          status: 'unexpected',
          results: [{ status: 'failed', errors: [{ message: `auth failed with ${secret}` }], stdout: [{ text: `token=${secret}` }] }],
        },
      ],
    });
    expect(JSON.stringify(run)).not.toContain(secret);
    expect(run.tests[0].attempts[0].errorCount).toBe(1);
  });

  test('warns when normalized counts differ from Playwright stats', () => {
    const report = syntheticReport({ tests: [passed('a')] }) as { stats: Record<string, unknown> };
    report.stats.expected = 5;
    const parsed = parsePlaywrightJson(JSON.stringify(report));
    if (!parsed.ok) throw new Error(parsed.error);
    const run = normalizeRun(parsed.report as RawReport, RAW);
    expect(run.warnings).toContain('stats.expected=5 differs from normalized count 1');
  });
});
