/**
 * Observability CLI (runs with Node's built-in TypeScript support, no extra dependencies).
 *
 *   node observability/cli.ts import <playwright-results.json> [--history <dir>]
 *   node observability/cli.ts report [--history <dir>] [--out <file>]
 *
 * Exit codes: 0 ok · 1 file not processable or history conflict · 2 usage error.
 * The CLI never runs in CI and never changes test results or exit codes of the suite.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { HistoryConflictError, importRun, loadHistory, recordRejection } from './history.ts';
import { normalizeRun } from './normalize.ts';
import { parsePlaywrightJson } from './parse-playwright-json.ts';
import { renderReport } from './report.ts';

const DEFAULT_HISTORY = 'observability/history';
const DEFAULT_OUT = 'observability/out/report.md';

function option(args: string[], name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

function importCommand(args: string[]): number {
  const file = args[0];
  if (!file || file.startsWith('--')) {
    console.error('usage: import <playwright-results.json> [--history <dir>]');
    return 2;
  }
  const historyDir = option(args, '--history', DEFAULT_HISTORY);
  const rawFile = toPosix(relative(process.cwd(), file));

  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch (e) {
    console.error(`not processable: cannot read ${rawFile}: ${(e as Error).message}`);
    return 1;
  }
  const rawSha256 = createHash('sha256').update(bytes).digest('hex');

  const parsed = parsePlaywrightJson(bytes.toString('utf8'));
  if (!parsed.ok) {
    const path = recordRejection(historyDir, { rawFile, rawSha256, reason: parsed.error });
    console.error(`not processable: ${parsed.error}\nrecorded rejection: ${toPosix(path)}`);
    return 1;
  }

  const run = normalizeRun(parsed.report, { rawFile, rawSha256 });
  try {
    const result = importRun(historyDir, run);
    const s = run.summary;
    console.log(
      `${result.status}: ${run.runKey} → ${toPosix(result.path)}\n` +
        `  completeness=${run.completeness.state} tests=${s.total} passed=${s.passed} failed=${s.failed} ` +
        `flaky=${s.flaky} skipped=${s.skipped} unknown=${s.unknown}`,
    );
    for (const w of run.warnings) console.log(`  warning: ${w}`);
    return 0;
  } catch (e) {
    if (e instanceof HistoryConflictError) {
      console.error(`conflict: ${e.message}`);
      return 1;
    }
    throw e;
  }
}

function reportCommand(args: string[]): number {
  const historyDir = option(args, '--history', DEFAULT_HISTORY);
  const out = option(args, '--out', DEFAULT_OUT);
  const history = loadHistory(historyDir);
  const markdown = renderReport({ history, generatedAt: new Date().toISOString(), historyLabel: toPosix(historyDir) });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, markdown);
  console.log(`report: ${toPosix(out)} (${history.runs.length} run(s), ${history.rejections.length} rejected)`);
  return 0;
}

const [command, ...rest] = process.argv.slice(2);
const code = command === 'import' ? importCommand(rest) : command === 'report' ? reportCommand(rest) : 2;
if (code === 2 && command !== 'import' && command !== 'report') {
  console.error('usage: node observability/cli.ts <import|report> ...');
}
process.exitCode = code;
