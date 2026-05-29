import { NextResponse } from "next/server";
import {
  getLatestTimings,
  clearAllTimings,
} from "@/lib/perf";

export async function GET() {
  const timings = getLatestTimings();

  return NextResponse.json({
    timings: timings ?? [],
    timestamp: Date.now(),
  });
}

export async function DELETE() {
  clearAllTimings();
  return NextResponse.json({ ok: true });
}
