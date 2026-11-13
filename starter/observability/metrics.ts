/**
 * Metrics engine. Pure functions over normalized runs: no clock, network or filesystem.
 * Every ratio returns `null` (rendered as "Insufficient data") instead of dividing by
 * zero, and missing values are never replaced with 0. Definitions: observability/README.md.
 */
import type { NormalizedRun, OutcomeCounts } from './contract.ts';
import { countOutcomes } from './normalize.ts';

/** Minimum comparable, complete runs before trends or percentiles are shown. */
export const MIN_SAMPLES_FOR_TRENDS = 5;

export type Ratio = { readonly value: number | null; readonly numerator: number; readonly denominator: number; readonly note?: string };

export type RunMetrics = {
  readonly runKey: string;
  readonly startTime: string;
  readonly completeness: NormalizedRun['completeness']['state'];
  readonly counts: OutcomeCounts;
  /** passed + failed + flaky (skipped and unknown excluded). */
  readonly executed: number;
  /** (passed + flaky) / executed */
  readonly passRate: Ratio;
  /** passed / executed */
  readonly firstAttemptPassRate: Ratio;
  /** flaky / executed — only measurable when at least one project has retries > 0. */
  readonly flakyRate: Ratio;
  readonly runnerDurationMs: number;
  readonly byProject: readonly { readonly project: string; readonly counts: OutcomeCounts }[];
};

export function ratio(numerator: number, denominator: number, note?: string): Ratio {
  return { value: denominator > 0 ? numerator / denominator : null, numerator, denominator, note };
}

export function runMetrics(run: NormalizedRun): RunMetrics {
  const c = run.summary;
  const executed = c.passed + c.failed + c.flaky;
  const retriesEnabled = run.config.projects.some((p) => p.retries > 0);
  const projects = [...new Set(run.tests.map((t) => t.project))].sort();

  return {
    runKey: run.runKey,
    startTime: run.execution.startTime,
    completeness: run.completeness.state,
    counts: c,
    executed,
    passRate: ratio(c.passed + c.flaky, executed),
    firstAttemptPassRate: ratio(c.passed, executed),
    flakyRate: retriesEnabled
      ? ratio(c.flaky, executed)
      : { value: null, numerator: c.flaky, denominator: executed, note: 'Not measurable (retries = 0)' },
    runnerDurationMs: run.execution.durationMs,
    byProject: projects.map((project) => ({
      project,
      counts: countOutcomes(run.tests.filter((t) => t.project === project)),
    })),
  };
}

/** Runs are comparable only if they ran the same projects with the same retries/repeatEach. */
export function comparabilitySignature(run: NormalizedRun): string {
  return run.config.projects
    .map((p) => `${p.name}:r${p.retries}:x${p.repeatEach}`)
    .sort()
    .join('|');
}

/** Nearest-rank percentile. Returns null for an empty sample. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

export type TrendResult =
  | { readonly status: 'insufficient'; readonly reason: string; readonly sampleSize: number }
  | {
      readonly status: 'ok';
      readonly signature: string;
      readonly sampleSize: number;
      readonly series: readonly { readonly runKey: string; readonly startTime: string; readonly passRate: number | null }[];
      /** Last minus first pass rate, in percentage points; null if either is undefined. */
      readonly passRateDeltaPp: number | null;
      readonly testDurations: readonly { readonly testKey: string; readonly samples: number; readonly p50Ms: number | null; readonly p90Ms: number | null }[];
    };

export type HistoryMetrics = {
  readonly totalRuns: number;
  readonly complete: number;
  readonly partial: number;
  readonly unknown: number;
  readonly period: { readonly from: string; readonly to: string } | null;
  /** Number of distinct comparability signatures among complete runs. */
  readonly signatures: readonly { readonly signature: string; readonly runs: number }[];
  readonly warnings: readonly string[];
  readonly trend: TrendResult;
};

export function historyMetrics(runs: readonly NormalizedRun[]): HistoryMetrics {
  const sorted = [...runs].sort((a, b) => a.execution.startTime.localeCompare(b.execution.startTime));
  const complete = sorted.filter((r) => r.completeness.state === 'complete');
  const warnings: string[] = [];

  const groups = new Map<string, NormalizedRun[]>();
  for (const run of complete) {
    const sig = comparabilitySignature(run);
    groups.set(sig, [...(groups.get(sig) ?? []), run]);
  }
  const signatures = [...groups.entries()]
    .map(([signature, group]) => ({ signature, runs: group.length }))
    .sort((a, b) => b.runs - a.runs || a.signature.localeCompare(b.signature));

  if (signatures.length > 1) {
    warnings.push(
      `${signatures.length} non-comparable configurations (different projects/retries); trends use only the largest group`,
    );
  }
  const excluded = sorted.length - complete.length;
  if (excluded > 0) warnings.push(`${excluded} partial/unknown run(s) excluded from trends`);

  let trend: TrendResult;
  const largest = signatures[0];
  if (!largest) {
    trend = { status: 'insufficient', reason: 'Insufficient history for trends: no complete runs', sampleSize: 0 };
  } else if (largest.runs < MIN_SAMPLES_FOR_TRENDS) {
    trend = {
      status: 'insufficient',
      reason: `Insufficient history for trends: ${largest.runs} comparable run(s), need ${MIN_SAMPLES_FOR_TRENDS}`,
      sampleSize: largest.runs,
    };
  } else {
    const group = groups.get(largest.signature) ?? [];
    const series = group.map((r) => ({ runKey: r.runKey, startTime: r.execution.startTime, passRate: runMetrics(r).passRate.value }));
    const first = series[0].passRate;
    const last = series[series.length - 1].passRate;

    const durations = new Map<string, number[]>();
    for (const run of group) {
      for (const t of run.tests) {
        if (t.finalAttemptDurationMs !== null) durations.set(t.testKey, [...(durations.get(t.testKey) ?? []), t.durationMs]);
      }
    }
    trend = {
      status: 'ok',
      signature: largest.signature,
      sampleSize: group.length,
      series,
      passRateDeltaPp: first !== null && last !== null ? (last - first) * 100 : null,
      testDurations: [...durations.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([testKey, values]) =>
          values.length >= MIN_SAMPLES_FOR_TRENDS
            ? { testKey, samples: values.length, p50Ms: percentile(values, 50), p90Ms: percentile(values, 90) }
            : { testKey, samples: values.length, p50Ms: null, p90Ms: null },
        ),
    };
  }

  return {
    totalRuns: sorted.length,
    complete: complete.length,
    partial: sorted.filter((r) => r.completeness.state === 'partial').length,
    unknown: sorted.filter((r) => r.completeness.state === 'unknown').length,
    period: sorted.length > 0 ? { from: sorted[0].execution.startTime, to: sorted[sorted.length - 1].execution.startTime } : null,
    signatures,
    warnings,
    trend,
  };
}
