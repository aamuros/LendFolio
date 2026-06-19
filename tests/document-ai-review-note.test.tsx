import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocumentAiReviewNote } from "@/components/document-ai-review-note";

describe("DocumentAiReviewNote", () => {
  it("renders AI pass as pre-screening language", () => {
    const markup = renderToStaticMarkup(
      <DocumentAiReviewNote
        review={{
          aiReviewStatus: "pass",
          aiReviewConfidence: 1,
          aiDetectedDocumentType: "valid_id",
          aiReviewReason:
            "The uploaded file appears to be a clear ID document and appears to match the requested document type.",
          aiRiskFlags: [],
          aiModel: "gemini-3.1-flash-lite",
          aiReviewedAt: "2026-06-19T00:00:00.000Z",
        }}
      />,
    );

    expect(markup).toContain("AI Pre-screen");
    expect(markup).toContain("Looks acceptable");
    expect(markup).not.toContain("AI Result");
    expect(markup).not.toContain(">Pass<");
  });

  it("renders AI fail as a possible mismatch", () => {
    const markup = renderToStaticMarkup(
      <DocumentAiReviewNote
        review={{
          aiReviewStatus: "fail",
          aiReviewConfidence: 1,
          aiDetectedDocumentType: "valid_id",
          aiReviewReason:
            "The uploaded file appears to be an ID document, but the requested document type may not match.",
          aiRiskFlags: ["wrong_type"],
          aiModel: "gemini-3.1-flash-lite",
          aiReviewedAt: "2026-06-19T00:00:00.000Z",
        }}
      />,
    );

    expect(markup).toContain("AI Pre-screen");
    expect(markup).toContain("Mismatch detected");
    expect(markup).not.toContain("AI Result");
    expect(markup).not.toContain(">Fail<");
  });
});
