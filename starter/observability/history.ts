/**
 * Local, append-only history of normalized runs (one JSON file per runKey).
 * Idempotent: re-importing the same raw file is a no-op; a different file with the same
 * runKey is a conflict and is NEVER silently overwritten.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA_VERSION, type NormalizedRun } from './contract.ts';

export type ImportOutcome = { readonly status: 'imported' | 'unchanged'; readonly path: string };

export type Rejection = { readonly rawFile: string; readonly rawSha256: string; readonly reason: string };

export type LoadedHistory = {
  readonly runs: readonly NormalizedRun[];
  readonly rejections: readonly Rejection[];
  /** History files that could not be read (corrupt or other schemaVersion). */
  readonly unreadable: readonly { readonly file: string; readonly error: string }[];
};

export class HistoryConflictError extends Error {}

/** `gha:123:1` → `gha_123_1.json`. Only safe filename characters are kept. */
export function historyFileName(runKey: string): string {
  return `${runKey.replace(/[^A-Za-z0-9._-]/g, '_')}.json`;
}

export function importRun(historyDir: string, run: NormalizedRun): ImportOutcome {
  mkdirSync(historyDir, { recursive: true });
  const path = join(historyDir, historyFileName(run.runKey));
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, 'utf8')) as NormalizedRun;
    if (existing.source?.rawSha256 === run.source.rawSha256) return { status: 'unchanged', path };
    throw new HistoryConflictError(
      `runKey ${run.runKey} already imported from a different raw file (sha256 ${existing.source?.rawSha256}); not overwriting`,
    );
  }
  // 'wx' fails if another process created the file in the meantime.
  writeFileSync(path, `${JSON.stringify(run, null, 2)}\n`, { flag: 'wx' });
  return { status: 'imported', path };
}

/** Records a non-processable file so the report can count it. Idempotent per sha256. */
export function recordRejection(historyDir: string, rejection: Rejection): string {
  const dir = join(historyDir, 'rejected');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${rejection.rawSha256}.json`);
  if (!existsSync(path)) writeFileSync(path, `${JSON.stringify(rejection, null, 2)}\n`, { flag: 'wx' });
  return path;
}

export function loadHistory(historyDir: string): LoadedHistory {
  if (!existsSync(historyDir)) return { runs: [], rejections: [], unreadable: [] };

  const runs: NormalizedRun[] = [];
  const unreadable: { file: string; error: string }[] = [];
  for (const file of readdirSync(historyDir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const data = JSON.parse(readFileSync(join(historyDir, file), 'utf8')) as Partial<NormalizedRun>;
      if (data.schemaVersion !== SCHEMA_VERSION) {
        unreadable.push({ file, error: `schemaVersion ${String(data.schemaVersion)} (expected ${SCHEMA_VERSION})` });
      } else {
        runs.push(data as NormalizedRun);
      }
    } catch (e) {
      unreadable.push({ file, error: (e as Error).message });
    }
  }

  const rejectedDir = join(historyDir, 'rejected');
  const rejections: Rejection[] = existsSync(rejectedDir)
    ? readdirSync(rejectedDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => JSON.parse(readFileSync(join(rejectedDir, f), 'utf8')) as Rejection)
    : [];

  return { runs, rejections, unreadable };
}
