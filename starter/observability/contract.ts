/**
 * Normalized test-run contract (custom, versioned).
 *
 * This is NOT Playwright's JSON reporter schema. `parse-playwright-json.ts` validates the
 * raw Playwright format; `normalize.ts` converts it into this contract. Bump
 * SCHEMA_VERSION on any breaking change and document it in observability/README.md.
 */
export const SCHEMA_VERSION = '1.0.0';

/** Logical result of one test (one test × one Playwright project), after all retries. */
export type Outcome = 'passed' | 'failed' | 'flaky' | 'skipped' | 'unknown';

/** Whether the run can be trusted as a full execution. */
export type CompletenessState = 'complete' | 'partial' | 'unknown';

/** Where a field's value came from. `null` fields carry no provenance. */
export type Provenance = 'playwright-json' | 'ci-metadata';

/** GitHub Actions context, copied from `config.metadata` (set in playwright.config.ts). */
export type CiContext = {
  readonly provider: 'github-actions';
  readonly runId: string;
  readonly runAttempt: string | null;
  readonly sha: string | null;
  readonly ref: string | null;
  readonly workflow: string | null;
  readonly event: string | null;
  /** Built only from GITHUB_SERVER_URL + GITHUB_REPOSITORY + GITHUB_RUN_ID; never guessed. */
  readonly runUrl: string | null;
};

/**
 * One attempt (retry) of a test. Deliberately excludes error messages, stdout/stderr
 * and attachments: they can contain sensitive data. Use the original evidence instead.
 */
export type Attempt = {
  readonly retry: number;
  /** Raw Playwright attempt status (passed, failed, timedOut, skipped, interrupted) or 'unknown'. */
  readonly status: string;
  readonly durationMs: number;
  readonly errorCount: number;
};

export type NormalizedTest = {
  /** `<project>::<file>::<describe > ... > title>`. A rename creates a new identity. */
  readonly testKey: string;
  readonly project: string;
  readonly file: string;
  readonly titlePath: readonly string[];
  readonly line: number;
  readonly outcome: Outcome;
  readonly expectedStatus: string;
  readonly attempts: readonly Attempt[];
  /** Sum of all attempt durations. */
  readonly durationMs: number;
  /** Duration of the last attempt, or null when the test never ran. */
  readonly finalAttemptDurationMs: number | null;
  readonly evidence: { readonly rawFile: string; readonly specId: string };
};

export type OutcomeCounts = {
  readonly passed: number;
  readonly failed: number;
  readonly flaky: number;
  readonly skipped: number;
  readonly unknown: number;
  readonly total: number;
};

export type NormalizedRun = {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  /** Deduplication key: `gha:<runId>:<runAttempt>` in CI, `local:<sha256 of raw file>` otherwise. */
  readonly runKey: string;
  readonly source: {
    readonly kind: 'playwright-json';
    readonly playwrightVersion: string | null;
    /** Path of the raw file at import time (relative, forward slashes). It may be overwritten later. */
    readonly rawFile: string;
    /** Hash of the raw file at import time, to verify evidence. */
    readonly rawSha256: string;
  };
  readonly execution: {
    readonly startTime: string;
    /** Runner wall time (`stats.duration`), NOT push-to-feedback time. */
    readonly durationMs: number;
    readonly ci: CiContext | null;
    readonly provenance: {
      readonly startTime: Provenance;
      readonly durationMs: Provenance;
      readonly ci: Provenance | null;
    };
  };
  readonly config: {
    readonly projects: readonly { readonly name: string; readonly retries: number; readonly repeatEach: number }[];
  };
  readonly completeness: { readonly state: CompletenessState; readonly reasons: readonly string[] };
  readonly summary: OutcomeCounts;
  /** Non-fatal data-quality notes (e.g. key collisions, stats mismatch). */
  readonly warnings: readonly string[];
  readonly tests: readonly NormalizedTest[];
};
