export const PERF_THRESHOLDS = {
  managerDashboard: {
    ttfbWarningMs: 500,
    ttfbCriticalMs: 2000,
    navigationWarningMs: 3000,
    navigationCriticalMs: 8000,
  },
  managerListPage: {
    navigationWarningMs: 2000,
    navigationCriticalMs: 5000,
  },
  maxQueryCountWarning: 20,
  maxQueryCountCritical: 50,
  maxLongTaskCountWarning: 5,
  maxLongTaskCountCritical: 15,
} as const;

export const PERF_CONFIG = {
  runsPerRoute: 5,
  warmUpRuns: 1,
  port: Number(process.env.PERF_PORT ?? 3099),
  baseUrl: process.env.PERF_BASE_URL ?? `http://localhost:${3099}`,
  dataset: process.env.PERF_DATASET ?? "small",
  outputDir: ".perf",
  traceOnThresholdExceed: true,
  timeoutMs: 30_000,
} as const;
