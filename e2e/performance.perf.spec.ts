import { test, expect } from "@playwright/test";
import {
  collectNavigationMetrics,
  loginAs,
  aggregateRuns,
  type RouteMetrics,
  type AggregatedMetrics,
} from "./perf-helpers";
import { PERF_CONFIG } from "../perf.config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PERF_OUTPUT_DIR = PERF_CONFIG.outputDir;
const BORROWER_EMAIL = process.env.PERF_BORROWER_EMAIL ?? "borrower@lendfolio.local";
const MANAGER_EMAIL = process.env.PERF_MANAGER_EMAIL ?? "manager@lendfolio.local";
const TEST_PASSWORD = process.env.PERF_TEST_PASSWORD ?? "LendFolio123!";

const totalRuns = PERF_CONFIG.warmUpRuns + PERF_CONFIG.runsPerRoute;

const publicRoutes = ["/", "/login"];
const borrowerRoutes = ["/borrower"];
const managerRoutes = [
  "/manager",
  "/manager/applications",
  "/manager/loans",
  "/manager/repayments",
  "/manager/audit-logs",
];

const allMetrics: Record<string, RouteMetrics[]> = {};

test.describe("Performance benchmarks", () => {
  test.beforeAll(() => {
    mkdirSync(join(PERF_OUTPUT_DIR, "traces"), { recursive: true });
    mkdirSync(join(PERF_OUTPUT_DIR, "screenshots"), { recursive: true });
  });

  test("public routes", async ({ page }) => {
    for (const route of publicRoutes) {
      allMetrics[route] = [];
      for (let i = 0; i < totalRuns; i++) {
        const isWarmUp = i < PERF_CONFIG.warmUpRuns;
        const metrics = await collectNavigationMetrics(
          page,
          route,
          i,
          isWarmUp,
        );
        allMetrics[route].push(metrics);

        if (!isWarmUp) {
          expect(
            metrics.navigationDurationMs,
            `${route} navigation should complete`,
          ).toBeLessThan(30_000);
        }
      }
    }
  });

  test("borrower routes", async ({ page }) => {
    const loggedIn = await loginAs(page, BORROWER_EMAIL, TEST_PASSWORD);
    if (!loggedIn) {
      test.skip(true, "Could not log in as borrower");
      return;
    }

    for (const route of borrowerRoutes) {
      allMetrics[route] = [];
      for (let i = 0; i < totalRuns; i++) {
        const isWarmUp = i < PERF_CONFIG.warmUpRuns;
        const metrics = await collectNavigationMetrics(
          page,
          route,
          i,
          isWarmUp,
        );
        allMetrics[route].push(metrics);
      }
    }
  });

  test("manager routes", async ({ page }) => {
    const loggedIn = await loginAs(page, MANAGER_EMAIL, TEST_PASSWORD);
    if (!loggedIn) {
      test.skip(true, "Could not log in as manager");
      return;
    }

    for (const route of managerRoutes) {
      allMetrics[route] = [];
      for (let i = 0; i < totalRuns; i++) {
        const isWarmUp = i < PERF_CONFIG.warmUpRuns;
        const metrics = await collectNavigationMetrics(
          page,
          route,
          i,
          isWarmUp,
        );
        allMetrics[route].push(metrics);

        if (!isWarmUp) {
          expect(
            metrics.navigationDurationMs,
            `${route} navigation should complete`,
          ).toBeLessThan(30_000);
        }
      }
    }
  });

  test("manager detail page", async ({ page }) => {
    const loggedIn = await loginAs(page, MANAGER_EMAIL, TEST_PASSWORD);
    if (!loggedIn) {
      test.skip(true, "Could not log in as manager");
      return;
    }

    await page.goto("/manager/applications");
    await page.waitForLoadState("networkidle");

    const detailLink = page.locator('a[href*="/manager/applications/"]').first();
    if ((await detailLink.count()) === 0) {
      test.skip(true, "No application detail links found");
      return;
    }

    const href = await detailLink.getAttribute("href");
    if (!href) {
      test.skip(true, "Could not get detail link href");
      return;
    }

    allMetrics[href] = [];
    for (let i = 0; i < totalRuns; i++) {
      const isWarmUp = i < PERF_CONFIG.warmUpRuns;
      const metrics = await collectNavigationMetrics(page, href, i, isWarmUp);
      allMetrics[href].push(metrics);
    }
  });

  test.afterAll(() => {
    const aggregated: Record<string, AggregatedMetrics> = {};
    for (const [route, runs] of Object.entries(allMetrics)) {
      aggregated[route] = aggregateRuns(runs);
    }

    const report = {
      config: {
        dataset: PERF_CONFIG.dataset,
        runsPerRoute: PERF_CONFIG.runsPerRoute,
        warmUpRuns: PERF_CONFIG.warmUpRuns,
        timestamp: new Date().toISOString(),
      },
      routes: aggregated,
      raw: allMetrics,
    };

    writeFileSync(
      join(PERF_OUTPUT_DIR, "metrics.json"),
      JSON.stringify(report, null, 2),
    );

    const markdown = generateReport(report);
    writeFileSync(join(PERF_OUTPUT_DIR, "report.md"), markdown);
  });
});

function generateReport(report: {
  config: { dataset: string; runsPerRoute: number; warmUpRuns: number; timestamp: string };
  routes: Record<string, AggregatedMetrics>;
}): string {
  const lines: string[] = [];

  lines.push("# LendFolio Performance Report");
  lines.push("");
  lines.push(`**Generated:** ${report.config.timestamp}`);
  lines.push(`**Dataset:** ${report.config.dataset}`);
  lines.push(`**Runs per route:** ${report.config.runsPerRoute} (+ ${report.config.warmUpRuns} warm-up)`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");

  const routes = Object.entries(report.routes);
  const sortedByNav = routes.sort(
    (a, b) => b[1].navigationDurationMs.median - a[1].navigationDurationMs.median,
  );

  lines.push("### Top 5 Slowest Routes (by median navigation time)");
  lines.push("");
  lines.push("| Rank | Route | Median (ms) | P95 (ms) | TTFB (ms) | FCP (ms) | LCP (ms) |");
  lines.push("|------|-------|-------------|----------|-----------|----------|----------|");
  for (let i = 0; i < Math.min(5, sortedByNav.length); i++) {
    const [route, m] = sortedByNav[i];
    lines.push(
      `| ${i + 1} | \`${route}\` | ${m.navigationDurationMs.median.toFixed(0)} | ${m.navigationDurationMs.p95.toFixed(0)} | ${m.ttfbMs.median.toFixed(0)} | ${m.fcpMs.median.toFixed(0)} | ${m.lcpMs.median.toFixed(0)} |`,
    );
  }
  lines.push("");

  lines.push("### Top 5 Slowest Server Loaders");
  lines.push("");

  const allLoaders: Array<{ route: string; key: string; median: number; p95: number }> = [];
  for (const [route, m] of routes) {
    for (const [key, stats] of Object.entries(m.serverTimings)) {
      allLoaders.push({ route, key, median: stats.median, p95: stats.p95 });
    }
  }
  allLoaders.sort((a, b) => b.median - a.median);

  lines.push("| Rank | Route | Loader | Median (ms) | P95 (ms) |");
  lines.push("|------|-------|--------|-------------|----------|");
  for (let i = 0; i < Math.min(5, allLoaders.length); i++) {
    const loader = allLoaders[i];
    lines.push(
      `| ${i + 1} | \`${loader.route}\` | ${loader.key} | ${loader.median.toFixed(0)} | ${loader.p95.toFixed(0)} |`,
    );
  }
  lines.push("");

  lines.push("## Baseline Metrics");
  lines.push("");
  lines.push(
    "| Route | Nav (ms) | TTFB (ms) | FCP (ms) | LCP (ms) | Long Tasks | TBT (ms) | Requests | Bytes | DOM Nodes |",
  );
  lines.push(
    "|-------|----------|-----------|----------|----------|------------|----------|----------|-------|-----------|",
  );

  for (const [route, m] of routes) {
    lines.push(
      `| \`${route}\` | ${m.navigationDurationMs.median.toFixed(0)} | ${m.ttfbMs.median.toFixed(0)} | ${m.fcpMs.median.toFixed(0)} | ${m.lcpMs.median.toFixed(0)} | ${m.longTaskCount.median.toFixed(0)} | ${m.totalBlockingTimeMs.median.toFixed(0)} | ${m.networkRequestCount.median.toFixed(0)} | ${(m.transferredBytes.median / 1024).toFixed(1)}KB | ${m.domNodeCount.median.toFixed(0)} |`,
    );
  }
  lines.push("");

  lines.push("## Server-Side Loaders");
  lines.push("");

  for (const [route, m] of routes) {
    const loaderEntries = Object.entries(m.serverTimings);
    if (loaderEntries.length === 0) continue;

    lines.push(`### \`${route}\``);
    lines.push("");
    lines.push("| Loader | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |");
    lines.push("|--------|-------------|----------|----------|----------|");
    for (const [key, stats] of loaderEntries) {
      lines.push(
        `| ${key} | ${stats.median.toFixed(0)} | ${stats.p95.toFixed(0)} | ${stats.min.toFixed(0)} | ${stats.max.toFixed(0)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Threshold Checks");
  lines.push("");
  lines.push("| Route | Metric | Value | Warning | Critical | Status |");
  lines.push("|-------|--------|-------|---------|----------|--------|");

  for (const [route, m] of routes) {
    for (const check of m.thresholds) {
      const statusEmoji =
        check.status === "critical"
          ? "🔴 CRITICAL"
          : check.status === "warning"
            ? "🟡 WARNING"
            : "🟢 OK";
      lines.push(
        `| \`${route}\` | ${check.metric} | ${check.value.toFixed(0)}ms | ${check.warning}ms | ${check.critical}ms | ${statusEmoji} |`,
      );
    }
  }
  lines.push("");

  lines.push("## Recommendations");
  lines.push("");
  lines.push("Based on the baseline measurements above:");
  lines.push("");
  lines.push("1. Review server loader timings — the slowest loaders are the primary bottleneck.");
  lines.push("2. Review TTFB — high TTFB indicates server-side processing time.");
  lines.push("3. Review long task count — high counts indicate expensive client-side work.");
  lines.push("4. Consider database aggregation (RPC/views) for dashboard-level queries.");
  lines.push("5. Consider batching related queries to reduce round-trip count.");
  lines.push("");

  lines.push("## Reproduction");
  lines.push("");
  lines.push("```bash");
  lines.push(`PERF_DATASET=${report.config.dataset} npm run perf:test`);
  lines.push("```");

  return lines.join("\n");
}
