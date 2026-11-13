// Logic tests with SYNTHETIC fixtures (see synthetic-report.ts). Not real evidence.
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import type { NormalizedRun } from '../contract.ts';
import { HistoryConflictError, importRun, loadHistory, recordRejection } from '../history.ts';
import { historyMetrics, percentile, runMetrics } from '../metrics.ts';
import { normalizeRun } from '../normalize.ts';
import { parsePlaywrightJson } from '../parse-playwright-json.ts';
import { renderReport } from '../report.ts';
import { failed, passed, skipped, syntheticReport, type SyntheticOptions } from './synthetic-report.ts';

function run(opts: SyntheticOptions, sha = 'a'.repeat(64)): NormalizedRun {
  const parsed = parsePlaywrightJson(JSON.stringify(syntheticReport(opts)));
  if (!parsed.ok) throw new Error(parsed.error);
  return normalizeRun(parsed.report, { rawFile: 'results/synthetic.json', rawSha256: sha });
}

/** N complete, comparable runs with distinct keys and start times. */
function series(n: number, retries = 0): NormalizedRun[] {
  return Array.from({ length: n }, (_, i) =>
    run(
      {
        projects: [{ name: 'chromium', retries }],
        startTime: `2026-01-0${i + 1}T00:00:00.000Z`,
        tests: [
          { title: 'a', status: 'expected', results: [{ status: 'passed', duration: (i + 1) * 100 }] },
          i === n - 1 ? failed('b') : passed('b'),
        ],
      },
      String(i).repeat(64),
    ),
  );
}

test.describe('runMetrics (hand-calculated)', () => {
  test('excludes skipped from the denominator and reports it separately', () => {
    // 3 passed, 1 failed, 2 skipped → executed 4, pass rate 3/4
    const m = runMetrics(run({ tests: [passed('a'), passed('b'), passed('c'), failed('d'), skipped('e'), skipped('f')] }));
    expect(m.counts.skipped).toBe(2);
    expect(m.executed).toBe(4);
    expect(m.passRate).toEqual({ value: 0.75, numerator: 3, denominator: 4, note: undefined });
    expect(m.firstAttemptPassRate.value).toBe(0.75);
  });

  test('flaky counts towards pass rate but not first-attempt pass rate', () => {
    // 2 passed + 1 flaky + 1 failed → pass rate 3/4, first-attempt 2/4, flaky 1/4
    const m = runMetrics(
      run({
        projects: [{ name: 'chromium', retries: 2 }],
        tests: [passed('a'), passed('b'), failed('c'), { title: 'd', status: 'flaky', results: [{ status: 'failed' }, { status: 'passed' }] }],
      }),
    );
    expect(m.passRate.value).toBe(0.75);
    expect(m.firstAttemptPassRate.value).toBe(0.5);
    expect(m.flakyRate.value).toBe(0.25);
  });

  test('flaky rate is not measurable without retries', () => {
    const m = runMetrics(run({ tests: [passed('a')] }));
    expect(m.flakyRate.value).toBeNull();
    expect(m.flakyRate.note).toBe('Not measurable (retries = 0)');
  });

  test('never divides by zero: all skipped → pass rate is null, not 0 or 100', () => {
    const m = runMetrics(run({ tests: [skipped('a')] }));
    expect(m.executed).toBe(0);
    expect(m.passRate.value).toBeNull();
  });

  test('percentile uses nearest rank', () => {
    expect(percentile([5, 1, 4, 2, 3], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(percentile([], 50)).toBeNull();
  });
});

test.describe('historyMetrics', () => {
  test('a single run produces no trend', () => {
    const h = historyMetrics(series(1));
    expect(h.trend).toEqual({ status: 'insufficient', reason: 'Insufficient history for trends: 1 comparable run(s), need 5', sampleSize: 1 });
  });

  test('warns about non-comparable runs and does not mix them', () => {
    const runs = [...series(3, 0), ...series(2, 2).map((r) => ({ ...r, runKey: `${r.runKey}-r2` }))];
    const h = historyMetrics(runs);
    expect(h.signatures).toEqual([
      { signature: 'chromium:r0:x1', runs: 3 },
      { signature: 'chromium:r2:x1', runs: 2 },
    ]);
    expect(h.warnings[0]).toMatch(/^2 non-comparable configurations/);
    expect(h.trend.status).toBe('insufficient');
  });

  test('computes trend and percentiles with enough comparable runs', () => {
    const h = historyMetrics(series(5));
    if (h.trend.status !== 'ok') throw new Error('expected a trend');
    expect(h.trend.sampleSize).toBe(5);
    expect(h.trend.passRateDeltaPp).toBe(-50); // 100% → 50%
    const a = h.trend.testDurations.find((d) => d.testKey.endsWith('::a'));
    expect(a).toEqual({ testKey: 'chromium::synthetic.spec.ts::a', samples: 5, p50Ms: 300, p90Ms: 500 });
  });

  test('excludes partial runs from trends and says so', () => {
    const partial = run({ errors: [{ message: 'x' }], tests: [passed('a')] }, 'f'.repeat(64));
    const h = historyMetrics([...series(1), partial]);
    expect(h.partial).toBe(1);
    expect(h.warnings).toContain('1 partial/unknown run(s) excluded from trends');
  });
});

test.describe('history (filesystem, temp dir)', () => {
  let dir: string;
  test.beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'obs-history-'));
  });
  test.afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('re-importing the same file is idempotent', () => {
    const r = run({ tests: [passed('a')] });
    expect(importRun(dir, r).status).toBe('imported');
    expect(importRun(dir, r).status).toBe('unchanged');
    expect(readdirSync(dir).filter((f) => f.endsWith('.json'))).toHaveLength(1);
    expect(loadHistory(dir).runs).toHaveLength(1);
  });

  test('a different file with the same runKey is a conflict, not an overwrite', () => {
    const ci = { GITHUB_RUN_ID: '7', GITHUB_RUN_ATTEMPT: '1' };
    importRun(dir, run({ metadata: ci, tests: [passed('a')] }, '1'.repeat(64)));
    expect(() => importRun(dir, run({ metadata: ci, tests: [failed('a')] }, '2'.repeat(64)))).toThrow(HistoryConflictError);
    expect(loadHistory(dir).runs[0].summary.passed).toBe(1);
  });

  test('records rejected files once and reports them', () => {
    recordRejection(dir, { rawFile: 'bad.json', rawSha256: 'b'.repeat(64), reason: 'empty file' });
    recordRejection(dir, { rawFile: 'bad.json', rawSha256: 'b'.repeat(64), reason: 'empty file' });
    const history = loadHistory(dir);
    expect(history.rejections).toHaveLength(1);
    const md = renderReport({ history, generatedAt: '2026-01-01T00:00:00.000Z', historyLabel: 'tmp' });
    expect(md).toContain('| 0 | 0 | 0 | 0 | 1 | 0 |');
    expect(md).toContain('Rejected `bad.json`');
  });
});

test.describe('renderReport', () => {
  const at = '2026-01-01T00:00:00.000Z';

  test('empty history says Insufficient data instead of inventing numbers', () => {
    const md = renderReport({ history: { runs: [], rejections: [], unreadable: [] }, generatedAt: at, historyLabel: 'h' });
    expect(md).toContain('- **Period:** Insufficient data');
    expect(md).toContain('Insufficient data: no runs imported.');
    expect(md).toContain('Insufficient history for trends');
    expect(md).not.toMatch(/\d+\.\d%/);
  });

  test('single run shows its metrics, its evidence and no trend', () => {
    const r = run({
      metadata: { GITHUB_RUN_ID: '9', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'deadbeefcafe', GITHUB_SERVER_URL: 'https://github.example', GITHUB_REPOSITORY: 'o/r' },
      tests: [passed('a'), failed('b')],
    });
    const md = renderReport({ history: { runs: [r], rejections: [], unreadable: [] }, generatedAt: at, historyLabel: 'h' });
    expect(md).toContain('| Pass rate ((passed + flaky) / executed) | 50.0% (1/2) |');
    expect(md).toContain('[run 9](https://github.example/o/r/actions/runs/9)');
    expect(md).toContain('commit `deadbee`');
    expect(md).toContain('Insufficient history for trends: 1 comparable run(s), need 5');
    expect(md).toContain('| chromium::synthetic.spec.ts::b | failed | failed@0 |');
  });
});
