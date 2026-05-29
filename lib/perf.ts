export type ServerTimingEntry = {
  key: string;
  durationMs: number;
  queryCount: number;
};

let requestCounter = 0;

const timingsStore = new Map<string, ServerTimingEntry[]>();

let latestRequestId: string | null = null;

function nextRequestId(): string {
  requestCounter += 1;
  return `req_${requestCounter}`;
}

export function recordServerTiming(key: string, durationMs: number, queryCount = 0) {
  if (!latestRequestId) {
    latestRequestId = nextRequestId();
  }
  const entries = timingsStore.get(latestRequestId) ?? [];
  entries.push({ key, durationMs, queryCount });
  timingsStore.set(latestRequestId, entries);
}

export function getLatestTimings(): ServerTimingEntry[] | null {
  if (!latestRequestId) return null;
  return timingsStore.get(latestRequestId) ?? null;
}

export function clearAllTimings() {
  timingsStore.clear();
  latestRequestId = null;
}

export async function withServerTiming<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  latestRequestId = nextRequestId();
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  recordServerTiming(key, durationMs);
  return { result, durationMs };
}
