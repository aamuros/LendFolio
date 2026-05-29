import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PERF_OUTPUT_DIR = ".perf";

function main() {
  const metricsPath = join(PERF_OUTPUT_DIR, "metrics.json");

  if (!existsSync(metricsPath)) {
    console.error(
      "No metrics.json found. Run `npm run perf:test` first.",
    );
    process.exit(1);
  }

  const raw = readFileSync(metricsPath, "utf-8");
  const data = JSON.parse(raw);

  console.log("\n=== LendFolio Performance Summary ===\n");
  console.log(`Dataset: ${data.config?.dataset ?? "unknown"}`);
  console.log(`Generated: ${data.config?.timestamp ?? "unknown"}`);
  console.log(`Routes tested: ${Object.keys(data.routes ?? {}).length}`);
  console.log("");

  const routes: Record<string, {
    navigationDurationMs: { median: number };
    ttfbMs: { median: number };
    fcpMs: { median: number };
    lcpMs: { median: number };
    longTaskCount: { median: number };
  }> = data.routes ?? {};
  const sorted = Object.entries(routes).sort(
    ([, a], [, b]) => b.navigationDurationMs.median - a.navigationDurationMs.median,
  );

  console.log("Route Performance (median):");
  console.log(
    "Route".padEnd(30) +
      "Nav(ms)".padStart(10) +
      "TTFB(ms)".padStart(10) +
      "FCP(ms)".padStart(10) +
      "LCP(ms)".padStart(10) +
      "LongTasks".padStart(10),
  );
  console.log("-".repeat(80));

  for (const [route, m] of sorted) {
    console.log(
      route.padEnd(30) +
        m.navigationDurationMs.median.toFixed(0).padStart(10) +
        m.ttfbMs.median.toFixed(0).padStart(10) +
        m.fcpMs.median.toFixed(0).padStart(10) +
        m.lcpMs.median.toFixed(0).padStart(10) +
        m.longTaskCount.median.toFixed(0).padStart(10),
    );
  }

  console.log("");
  console.log(`Full report: ${join(PERF_OUTPUT_DIR, "report.md")}`);
  console.log(`Raw metrics: ${join(PERF_OUTPUT_DIR, "metrics.json")}`);
}

main();
