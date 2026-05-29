import type { Page, Response } from "@playwright/test";
import { PERF_THRESHOLDS } from "../perf.config";

export type RouteMetrics = {
  route: string;
  runIndex: number;
  navigationDurationMs: number;
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  longTaskCount: number;
  totalBlockingTimeMs: number;
  networkRequestCount: number;
  transferredBytes: number;
  domNodeCount: number;
  serverTimings: ServerTimingEntry[];
  timestamp: number;
  isWarmUp: boolean;
};

export type ServerTimingEntry = {
  key: string;
  durationMs: number;
  queryCount: number;
};

export type AggregatedMetrics = {
  route: string;
  runs: number;
  navigationDurationMs: StatSummary;
  ttfbMs: StatSummary;
  fcpMs: StatSummary;
  lcpMs: StatSummary;
  longTaskCount: StatSummary;
  totalBlockingTimeMs: StatSummary;
  networkRequestCount: StatSummary;
  transferredBytes: StatSummary;
  domNodeCount: StatSummary;
  serverTimings: Record<string, StatSummary>;
  thresholds: ThresholdCheck[];
};

export type StatSummary = {
  min: number;
  max: number;
  median: number;
  p95: number;
  mean: number;
};

export type ThresholdCheck = {
  metric: string;
  value: number;
  warning: number;
  critical: number;
  status: "ok" | "warning" | "critical";
};

export function computeStats(values: number[]): StatSummary {
  if (values.length === 0) {
    return { min: 0, max: 0, median: 0, p95: 0, mean: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    mean: sum / sorted.length,
  };
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export async function collectNavigationMetrics(
  page: Page,
  route: string,
  runIndex: number,
  isWarmUp: boolean,
): Promise<RouteMetrics> {
  const networkRequests: Array<{ url: string; size: number }> = [];
  let totalTransferred = 0;

  page.on("response", (response: Response) => {
    const headers = response.headers();
    const contentLength = headers["content-length"];
    const size = contentLength ? parseInt(contentLength, 10) : 0;
    totalTransferred += size;
    networkRequests.push({ url: response.url(), size });
  });

  const startTime = Date.now();
  await page.goto(route, { waitUntil: "networkidle" });
  const navigationDurationMs = Date.now() - startTime;

  const navTiming = await page.evaluate(() => {
    const entries = performance.getEntriesByType("navigation");
    if (entries.length === 0) return null;
    const nav = entries[0] as PerformanceNavigationTiming;
    return {
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    };
  });

  const paintTiming = await page.evaluate(() => {
    const entries = performance.getEntriesByType("paint");
    const result: { fcp: number; lcp: number } = { fcp: 0, lcp: 0 };
    for (const entry of entries) {
      if (entry.name === "first-contentful-paint") result.fcp = entry.startTime;
    }
    return result;
  });

  const lcpValue = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let lcp = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          lcp = entry.startTime;
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(lcp);
      }, 1000);
    });
  });

  const longTasks = await page.evaluate(() => {
    return new Promise<{ count: number; totalDuration: number }>((resolve) => {
      let count = 0;
      let totalDuration = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            count++;
            totalDuration += entry.duration - 50;
          }
        }
      });
      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch {
        // longtask observer may not be available
      }
      setTimeout(() => {
        observer.disconnect();
        resolve({ count, totalDuration });
      }, 1000);
    });
  });

  const domNodeCount = await page.evaluate(() => {
    return document.querySelectorAll("*").length;
  });

  let serverTimings: ServerTimingEntry[] = [];
  try {
    const response = await page.request.get("/api/perf/timings");
    if (response.ok()) {
      const data = await response.json();
      serverTimings = data.timings ?? [];
    }
  } catch {
    // Server timings may not be available
  }

  return {
    route,
    runIndex,
    navigationDurationMs,
    ttfbMs: navTiming?.ttfb ?? 0,
    fcpMs: paintTiming.fcp,
    lcpMs: lcpValue,
    longTaskCount: longTasks.count,
    totalBlockingTimeMs: longTasks.totalDuration,
    networkRequestCount: networkRequests.length,
    transferredBytes: totalTransferred,
    domNodeCount,
    serverTimings,
    timestamp: Date.now(),
    isWarmUp,
  };
}

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<boolean> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="email"], input[type="email"]');
  const passwordInput = page.locator(
    'input[name="password"], input[type="password"]',
  );

  if ((await emailInput.count()) === 0) {
    return false;
  }

  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")',
  );
  await submitButton.click();

  try {
    await page.waitForURL(
      (url) => {
        const path = url.pathname;
        return (
          path !== "/login" &&
          path !== "/signup" &&
          !path.startsWith("/login")
        );
      },
      { timeout: 10_000 },
    );
    return true;
  } catch {
    return false;
  }
}

export function aggregateRuns(runs: RouteMetrics[]): AggregatedMetrics {
  const nonWarmup = runs.filter((r) => !r.isWarmUp);
  const data = nonWarmup.length > 0 ? nonWarmup : runs;

  const serverTimingKeys = new Set<string>();
  for (const run of data) {
    for (const timing of run.serverTimings) {
      serverTimingKeys.add(timing.key);
    }
  }

  const serverTimingsAgg: Record<string, StatSummary> = {};
  for (const key of serverTimingKeys) {
    const durations = data
      .flatMap((r) =>
        r.serverTimings.filter((t) => t.key === key).map((t) => t.durationMs),
      )
      .filter((d) => d > 0);
    serverTimingsAgg[key] = computeStats(durations);
  }

  const route = data[0]?.route ?? "";
  const thresholds = checkThresholds(route, data);

  return {
    route,
    runs: data.length,
    navigationDurationMs: computeStats(data.map((r) => r.navigationDurationMs)),
    ttfbMs: computeStats(data.map((r) => r.ttfbMs)),
    fcpMs: computeStats(data.map((r) => r.fcpMs)),
    lcpMs: computeStats(data.map((r) => r.lcpMs)),
    longTaskCount: computeStats(data.map((r) => r.longTaskCount)),
    totalBlockingTimeMs: computeStats(data.map((r) => r.totalBlockingTimeMs)),
    networkRequestCount: computeStats(data.map((r) => r.networkRequestCount)),
    transferredBytes: computeStats(data.map((r) => r.transferredBytes)),
    domNodeCount: computeStats(data.map((r) => r.domNodeCount)),
    serverTimings: serverTimingsAgg,
    thresholds,
  };
}

function checkThresholds(
  route: string,
  runs: RouteMetrics[],
): ThresholdCheck[] {
  const checks: ThresholdCheck[] = [];
  const isManagerDashboard = route === "/manager";
  const isManagerList =
    route.startsWith("/manager/") && route.split("/").length === 3;

  if (isManagerDashboard) {
    const medianTtfb = computeStats(runs.map((r) => r.ttfbMs)).median;
    checks.push({
      metric: "TTFB",
      value: medianTtfb,
      warning: PERF_THRESHOLDS.managerDashboard.ttfbWarningMs,
      critical: PERF_THRESHOLDS.managerDashboard.ttfbCriticalMs,
      status:
        medianTtfb >= PERF_THRESHOLDS.managerDashboard.ttfbCriticalMs
          ? "critical"
          : medianTtfb >= PERF_THRESHOLDS.managerDashboard.ttfbWarningMs
            ? "warning"
            : "ok",
    });

    const medianNav = computeStats(runs.map((r) => r.navigationDurationMs))
      .median;
    checks.push({
      metric: "Navigation",
      value: medianNav,
      warning: PERF_THRESHOLDS.managerDashboard.navigationWarningMs,
      critical: PERF_THRESHOLDS.managerDashboard.navigationCriticalMs,
      status:
        medianNav >= PERF_THRESHOLDS.managerDashboard.navigationCriticalMs
          ? "critical"
          : medianNav >= PERF_THRESHOLDS.managerDashboard.navigationWarningMs
            ? "warning"
            : "ok",
    });
  }

  if (isManagerList) {
    const medianNav = computeStats(runs.map((r) => r.navigationDurationMs))
      .median;
    checks.push({
      metric: "Navigation",
      value: medianNav,
      warning: PERF_THRESHOLDS.managerListPage.navigationWarningMs,
      critical: PERF_THRESHOLDS.managerListPage.navigationCriticalMs,
      status:
        medianNav >= PERF_THRESHOLDS.managerListPage.navigationCriticalMs
          ? "critical"
          : medianNav >= PERF_THRESHOLDS.managerListPage.navigationWarningMs
            ? "warning"
            : "ok",
    });
  }

  const medianLongTasks = computeStats(runs.map((r) => r.longTaskCount)).median;
  checks.push({
    metric: "Long task count",
    value: medianLongTasks,
    warning: PERF_THRESHOLDS.maxLongTaskCountWarning,
    critical: PERF_THRESHOLDS.maxLongTaskCountCritical,
    status:
      medianLongTasks >= PERF_THRESHOLDS.maxLongTaskCountCritical
        ? "critical"
        : medianLongTasks >= PERF_THRESHOLDS.maxLongTaskCountWarning
          ? "warning"
          : "ok",
  });

  return checks;
}
