import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/access-control";
import { loadManagerBorrowerVerification } from "@/lib/manager-operations";
import {
  buildManagerExportFilename,
  generateApprovedBorrowerPdf,
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
  const result = await loadManagerBorrowerVerification(access.supabase, id);

  if (!result.verification) {
    return NextResponse.json(
      { message: "Borrower verification not found." },
      { status: 404 },
    );
  }

  if (result.verification.verificationStatus !== "approved") {
    return NextResponse.json(
      { message: "Only approved borrowers can be exported." },
      { status: 400 },
    );
  }

  const bytes = await generateApprovedBorrowerPdf(result.verification);
  const filename = buildManagerExportFilename(
    "approved-borrower",
    result.verification.borrower.displayName,
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
