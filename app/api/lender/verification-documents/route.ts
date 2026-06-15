import { NextResponse } from "next/server";
import { uploadLenderVerificationDocument } from "@/lib/lender-verification-upload";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Could not read verification document." },
      { status: 400 },
    );
  }

  const result = await uploadLenderVerificationDocument(formData);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
