"use server";

import { GoogleGenAI } from "@google/genai";
import type { BorrowerAssistantSafeSummary } from "@/lib/borrower-assistant/types";

const GEMINI_MODEL = "gemini-2.5-flash";

export async function polishBorrowerAssistantReply(
  summary: BorrowerAssistantSafeSummary,
) {
  const fallback = summary.ruleBasedAnswer;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return fallback;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildGeminiPrompt(summary),
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 220,
      },
    });
    const polished = response.text?.trim();

    return polished || fallback;
  } catch {
    return fallback;
  }
}

function buildGeminiPrompt(summary: BorrowerAssistantSafeSummary) {
  return `You are a borrower support assistant for LendFolio.
Use only the provided summary.
Do not invent offers, amounts, lenders, dates, or statuses.
Do not provide legal or financial guarantees.
Do not expose internal IDs or sensitive details.
Keep the answer concise and borrower-friendly.
Tell the borrower to review full offer details before accepting.

Rewrite the already-calculated rule-based answer in clearer borrower-friendly language. The deterministic rule-based answer is the source of truth. Do not change the offer ranking, best offer selection, profile blockers, credit limit explanation, or borrower next action.

Provided summary:
${JSON.stringify(summary, null, 2)}`;
}
