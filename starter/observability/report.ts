/**
 * Static Markdown report. Pure: the caller injects `generatedAt` and the history.
 * Never fills gaps: undefined metrics are printed as "Insufficient data".
 */
import { SCHEMA_VERSION, type NormalizedRun } from './contract.ts';
import type { LoadedHistory } from './history.ts';
import { historyMetrics, MIN_SAMPLES_FOR_TRENDS, runMetrics, type Ratio } from './metrics.ts';

export const INSUFFICIENT = 'Insufficient data';

export function formatRatio(r: Ratio): string {
  if (r.value === null) return r.note ?? INSUFFICIENT;
  return `${(r.value * 100).toFixed(1)}% (${r.numerator}/${r.denominator})`;
}

function formatMs(ms: number | null): string {
  return ms === null ? INSUFFICIENT : `${(ms / 1000).toFixed(2)} s`;
}

/** Escapes characters that would break a Markdown table cell. */
function cell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function evidence(run: NormalizedRun): string {
  const ci = run.execution.ci;
  const raw = `\`${run.source.rawFile}\` (sha256 \`${run.source.rawSha256.slice(0, 12)}…\`)`;
  if (!ci) return `Local run — ${raw}`;
  const link = ci.runUrl ? `[run ${ci.runId}](${ci.runUrl})` : `run ${ci.runId}`;
  return `GitHub Actions ${link}, attempt ${ci.runAttempt ?? 'unknown'}, commit \`${ci.sha?.slice(0, 7) ?? 'unknown'}\`, ref \`${ci.ref ?? 'unknown'}\` — ${raw}`;
}

export type ReportInput = {
  readonly history: LoadedHistory;
  /** ISO timestamp, injected so the renderer stays deterministic. */
  readonly generatedAt: string;
  /** Human-readable history location, e.g. `observability/history`. */
  readonly historyLabel: string;
};

export function renderReport({ history, generatedAt, historyLabel }: ReportInput): string {
  const h = historyMetrics(history.runs);
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(
    '# Test Observability Report',
    '',
    `- **Generated:** ${generatedAt}`,
    `- **Source:** ${h.totalRuns} normalized run(s) in \`${historyLabel}\` (schema ${SCHEMA_VERSION})`,
    `- **Period:** ${h.period ? `${h.period.from} → ${h.period.to}` : INSUFFICIENT}`,
    '- **Definitions:** see `observability/README.md` (metrics dictionary).',
    '- **Scope:** only runs imported into this local history. This is not production telemetry.',
    '',
    '## Data completeness',
    '',
    '| Imported runs | Complete | Partial | Unknown | Rejected (non-processable) | Unreadable history files |',
    '| --- | --- | --- | --- | --- | --- |',
    `| ${h.totalRuns} | ${h.complete} | ${h.partial} | ${h.unknown} | ${history.rejections.length} | ${history.unreadable.length} |`,
    '',
  );
  for (const r of history.rejections) push(`- Rejected \`${r.rawFile}\` (sha256 \`${r.rawSha256.slice(0, 12)}…\`): ${r.reason}`);
  for (const u of history.unreadable) push(`- Unreadable \`${u.file}\`: ${u.error}`);
  if (history.rejections.length + history.unreadable.length > 0) push('');

  const sorted = [...history.runs].sort((a, b) => a.execution.startTime.localeCompare(b.execution.startTime));
  const latest = sorted[sorted.length - 1];

  push('## Latest run', '');
  if (!latest) {
    push(`${INSUFFICIENT}: no runs imported. Run the suite, then \`npm run obs:import -- results/playwright-results.json\`.`, '');
  } else {
    const m = runMetrics(latest);
    push(
      `- **Run:** \`${latest.runKey}\` started ${latest.execution.startTime}`,
      `- **Evidence:** ${evidence(latest)}`,
      `- **Completeness:** ${latest.completeness.state}${latest.completeness.reasons.length ? ` — ${latest.completeness.reasons.join('; ')}` : ''}`,
      '',
      '| Metric | Value |',
      '| --- | --- |',
      `| Logical tests | ${m.counts.total} |`,
      `| Passed / Failed / Flaky / Skipped / Unknown | ${m.counts.passed} / ${m.counts.failed} / ${m.counts.flaky} / ${m.counts.skipped} / ${m.counts.unknown} |`,
      `| Executed (passed + failed + flaky) | ${m.executed} |`,
      `| Pass rate ((passed + flaky) / executed) | ${formatRatio(m.passRate)} |`,
      `| First-attempt pass rate (passed / executed) | ${formatRatio(m.firstAttemptPassRate)} |`,
      `| Flaky rate (flaky / executed) | ${formatRatio(m.flakyRate)} |`,
      `| Runner duration (not push-to-feedback time) | ${formatMs(m.runnerDurationMs)} |`,
      '',
      'A 100% pass rate does not mean there is no risk: it only covers what these tests assert.',
      '',
      '| Project | Passed | Failed | Flaky | Skipped | Unknown |',
      '| --- | --- | --- | --- | --- | --- |',
      ...m.byProject.map(
        (p) => `| ${cell(p.project)} | ${p.counts.passed} | ${p.counts.failed} | ${p.counts.flaky} | ${p.counts.skipped} | ${p.counts.unknown} |`,
      ),
      '',
    );
    const notPassed = latest.tests.filter((t) => t.outcome !== 'passed');
    if (notPassed.length > 0) {
      push('| Test needing attention | Outcome | Attempts |', '| --- | --- | --- |');
      for (const t of notPassed) {
        push(`| ${cell(t.testKey)} | ${t.outcome} | ${t.attempts.map((a) => `${a.status}@${a.retry}`).join(', ') || 'none'} |`);
      }
      push('');
    }
    for (const w of latest.warnings) push(`- ⚠ ${w}`);
    if (latest.warnings.length) push('');
  }

  push(
    '## All runs',
    '',
    '| Start | Run | Completeness | P / F / Fl / S / U | Pass rate | Runner duration | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  if (sorted.length === 0) push(`| ${INSUFFICIENT} | | | | | | |`);
  for (const run of sorted) {
    const m = runMetrics(run);
    const c = m.counts;
    push(
      `| ${run.execution.startTime} | \`${cell(run.runKey.slice(0, 24))}\` | ${run.completeness.state} | ${c.passed} / ${c.failed} / ${c.flaky} / ${c.skipped} / ${c.unknown} | ${formatRatio(m.passRate)} | ${formatMs(m.runnerDurationMs)} | ${cell(evidence(run))} |`,
    );
  }
  push('');

  push('## Trends', '');
  if (h.trend.status === 'insufficient') {
    push(`${h.trend.reason}. Trends and percentiles need at least ${MIN_SAMPLES_FOR_TRENDS} complete, comparable runs.`, '');
  } else {
    const t = h.trend;
    push(
      `- **Comparable group:** \`${t.signature}\` (${t.sampleSize} runs)`,
      `- **Pass-rate change, first → last:** ${t.passRateDeltaPp === null ? INSUFFICIENT : `${t.passRateDeltaPp.toFixed(1)} pp`} (a change does not identify its cause)`,
      '',
      '| Test | Samples | p50 duration | p90 duration |',
      '| --- | --- | --- | --- |',
      ...t.testDurations.map((d) => `| ${cell(d.testKey)} | ${d.samples} | ${formatMs(d.p50Ms)} | ${formatMs(d.p90Ms)} |`),
      '',
    );
  }

  if (h.warnings.length > 0) {
    push('## Data-quality warnings', '', ...h.warnings.map((w) => `- ⚠ ${w}`), '');
  }

  push(
    '## Feedback loop',
    '',
    'Signal (this report) → Evidence (raw file / CI run above) → Hypothesis → Proposed action → Human approval → Later validation with new runs.',
    '',
  );
  return lines.join('\n');
}
