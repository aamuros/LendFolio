import { NextResponse } from "next/server";
import { loadLenderApplicationDetail } from "@/lib/lender-applications";

type LenderApplicationDetailApiContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: LenderApplicationDetailApiContext,
) {
  const { id } = await params;
  const result = await loadLenderApplicationDetail(id);

  if (result.ok) {
    return NextResponse.json(result);
  }

  const status =
    result.mode === "auth"
      ? 401
      : result.mode === "not-found"
        ? 404
        : 500;

  return NextResponse.json(result, { status });
}
