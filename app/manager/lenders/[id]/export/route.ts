import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/access-control";
import { loadManagerLenderDetail } from "@/lib/manager-operations";
import {
  buildManagerExportFilename,
  generateApprovedLenderPdf,
} from "@/lib/manager-pdf-export";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireManager();

  if (!access.ok) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await loadManagerLenderDetail(access.supabase, id);

  if (!result.lender) {
    return NextResponse.json({ message: "Lender not found." }, { status: 404 });
  }

  if (result.lender.verificationStatus !== "approved") {
    return NextResponse.json(
      { message: "Only approved lenders can be exported." },
      { status: 400 },
    );
  }

  const bytes = await generateApprovedLenderPdf(result.lender);
  const filename = buildManagerExportFilename(
    "approved-lender",
    result.lender.organizationName || result.lender.profile.displayName,
  );

  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
