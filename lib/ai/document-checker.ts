import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { z } from "zod";
import {
  documentAiDecisions,
  documentAiDetectedTypes,
  documentAiReadabilityValues,
  type DocumentAiDecision,
  type DocumentAiDetectedType,
  type DocumentAiReadability,
  type DocumentAiReviewStatus,
} from "@/lib/ai/document-review";

export const DOCUMENT_CHECKER_MODEL = "gemini-3.1-flash-lite";

const safeRiskFlags = new Set([
  "blurry",
  "cropped",
  "incomplete",
  "wrong_type",
  "blank",
  "random_image",
  "low_confidence",
  "possible_tampering",
  "unsupported_document",
  "sensitive_details_ignored",
  "other",
]);

const documentCheckSchema = z.object({
  isDocument: z.boolean(),
  detectedType: z.enum(documentAiDetectedTypes),
  matchesRequestedType: z.boolean(),
  readability: z.enum(documentAiReadabilityValues),
  riskFlags: z.array(z.string()).max(20),
  decision: z.enum(documentAiDecisions),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(1000),
});

export type DocumentCheckerInput = {
  file: File;
  requestedDocumentType: string;
  userRole: "borrower" | "lender";
};

export type GeminiDocumentCheckJson = {
  isDocument: boolean;
  detectedType: DocumentAiDetectedType;
  matchesRequestedType: boolean;
  readability: DocumentAiReadability;
  riskFlags: string[];
  decision: DocumentAiDecision;
  confidence: number;
  reason: string;
};

export type DocumentCheckerResult = GeminiDocumentCheckJson & {
  aiReviewStatus: DocumentAiReviewStatus;
  aiModel: string;
  aiReviewedAt: string;
};

export async function checkVerificationDocumentWithAi({
  file,
  requestedDocumentType,
  userRole,
}: DocumentCheckerInput): Promise<DocumentCheckerResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

  if (!apiKey) {
    return createErrorResult("AI pre-screening is unavailable; manual review is required.");
  }

  try {
    const base64File = Buffer.from(await file.arrayBuffer()).toString("base64");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DOCUMENT_CHECKER_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildDocumentCheckPrompt({
                requestedDocumentType,
                userRole,
              }),
            },
            createPartFromBase64(base64File, file.type),
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0,
        maxOutputTokens: 500,
      },
    });

    const parsed = parseDocumentCheckResponse(response.text);

    if (!parsed) {
      return createErrorResult("AI pre-screening returned an unusable result; manual review is required.");
    }

    return {
      ...parsed,
      aiReviewStatus: parsed.decision,
      aiModel: DOCUMENT_CHECKER_MODEL,
      aiReviewedAt: new Date().toISOString(),
    };
  } catch {
    return createErrorResult("AI pre-screening could not be completed; manual review is required.");
  }
}

function buildDocumentCheckPrompt({
  requestedDocumentType,
  userRole,
}: Pick<DocumentCheckerInput, "requestedDocumentType" | "userRole">) {
  const isBorrower = userRole === "borrower";

  return [
    isBorrower
      ? "You are helping LendFolio automatically screen a borrower verification upload."
      : "You are helping LendFolio pre-screen a verification upload for manual review.",
    isBorrower
      ? "Your decision can auto-accept borrower documents only when the upload is readable, clearly document-like, and visually matches the requested type."
      : "You are not the final legal verifier. A human manager makes the final approval decision.",
    `User role: ${userRole}.`,
    `Requested document type: ${requestedDocumentType}.`,
    "",
    "Classify only whether the file appears to be a document, what broad type it appears to be, whether it appears to match the requested type, readability, risk flags, decision, confidence, and a brief reason.",
    'Use cautious wording such as "appears to be", "visually resembles", or "may match". Do not state that a document is authentic, legally valid, government-issued, verified, or approved. Do not claim final verification.',
    "Do not claim that any government ID or license is legally authentic.",
    "Do not extract, quote, describe, or store sensitive personal details, including full names, ID numbers, addresses, birthdays, signatures, or face descriptions.",
    'The reason must not say "this is authentic", "this is verified", or similar final-verification language.',
    "If the requested document type is student_id, drivers_license, passport, sss, or postal_id, treat it as an exact valid ID subtype. Use detectedType valid_id when the file is an ID, but set matchesRequestedType false and decision fail when the visible ID subtype is different from the requested subtype.",
    "If the requested type is authorized_representative_id, use detectedType valid_id when the file appears to be a representative ID and set matchesRequestedType accordingly.",
    "If the requested type is collection_policy or sample_loan_terms, use detectedType other when the file appears to match that requested business document.",
    "",
    "Decision rules:",
    "- pass: the file is readable and appears to match the requested document type.",
    "- needs_manual_review: the file may be valid but is blurry, cropped, incomplete, low-confidence, or uncertain.",
    "- fail: the file is clearly unrelated, blank, a random image, unreadable, or clearly the wrong document type.",
    "",
    "Use riskFlags only from this list: blurry, cropped, incomplete, wrong_type, blank, random_image, low_confidence, possible_tampering, unsupported_document, sensitive_details_ignored, other.",
    "Return strict JSON only with this exact shape:",
    '{"isDocument":boolean,"detectedType":"valid_id|business_proof|address_proof|business_registration|authorization_letter|lending_license|proof_of_address|other|unknown","matchesRequestedType":boolean,"readability":"clear|partially_readable|unreadable","riskFlags":["string"],"decision":"pass|needs_manual_review|fail","confidence":number,"reason":"string"}',
  ].join("\n");
}

function parseDocumentCheckResponse(
  responseText: string | undefined,
): GeminiDocumentCheckJson | null {
  if (!responseText) return null;

  try {
    const json = JSON.parse(extractJsonObject(responseText));
    const parsed = documentCheckSchema.safeParse(json);

    if (!parsed.success) {
      return null;
    }

    const decision = parsed.data.decision;
    const riskFlags = sanitizeRiskFlags(parsed.data.riskFlags, decision);

    return {
      isDocument: parsed.data.isDocument,
      detectedType: parsed.data.detectedType,
      matchesRequestedType: parsed.data.matchesRequestedType,
      readability: parsed.data.readability,
      riskFlags,
      decision,
      confidence: parsed.data.confidence,
      reason: sanitizeAiReason(parsed.data.reason, 1000),
    };
  } catch {
    return null;
  }
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function sanitizeRiskFlags(flags: string[], decision: DocumentAiDecision) {
  const normalized = flags
    .map((flag) =>
      sanitizeAiText(flag, 80)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    )
    .filter((flag) => safeRiskFlags.has(flag));

  const uniqueFlags = [...new Set(normalized)].slice(0, 12);

  if (uniqueFlags.length > 0) {
    return uniqueFlags;
  }

  return decision === "pass" ? [] : ["other"];
}

function sanitizeAiText(value: string, maxLength: number) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted]")
    .replace(/\b\d{4,}\b/g, "[redacted]")
    .replace(
      /\b(?:birth(?:day|date)|date of birth|dob|address|signature|full name|id number|face)\b\s*[:,-]?\s*[^.]+/gi,
      "[redacted]",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeAiReason(value: string, maxLength: number) {
  const sanitized = sanitizeAiText(value, maxLength)
    .replace(/\bauthentic\b/gi, "appears consistent")
    .replace(/\blegally valid\b/gi, "appears relevant")
    .replace(/\bverified\b/gi, "appears to need review")
    .replace(/\bapproved\b/gi, "appears acceptable");

  if (!/\b(appears|visually resembles|may match|may not match)\b/i.test(sanitized)) {
    return `The uploaded file appears to require manual review. ${sanitized}`.slice(
      0,
      maxLength,
    );
  }

  return sanitized;
}

function createErrorResult(reason: string): DocumentCheckerResult {
  return {
    isDocument: false,
    detectedType: "unknown",
    matchesRequestedType: false,
    readability: "unreadable",
    riskFlags: ["other"],
    decision: "needs_manual_review",
    confidence: 0,
    reason,
    aiReviewStatus: "error",
    aiModel: DOCUMENT_CHECKER_MODEL,
    aiReviewedAt: new Date().toISOString(),
  };
}
