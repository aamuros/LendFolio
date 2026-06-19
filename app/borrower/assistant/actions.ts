"use server";

import { GoogleGenAI } from "@google/genai";
import type { BorrowerAssistantSafeSummary } from "@/lib/borrower-assistant/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const MIN_POLISHED_REPLY_LENGTH = 50;
const GEMINI_LOG_PREFIX = "[BorrowerAssistant/Gemini]";

export async function polishBorrowerAssistantReply(
  summary: BorrowerAssistantSafeSummary,
) {
  const fallback = summary.ruleBasedAnswer;
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    warnGemini("missing_key", "Skipping polish request.");
    return fallback;
  }

  try {
    warnGemini("attempt", `Polishing ${summary.promptTopic} answer.`);
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
        maxOutputTokens: 400,
      },
    });
    const polished = response.text?.trim();

    if (!polished || !isUsablePolishedReply(polished, summary)) {
      warnGemini("unusable_response", "Using deterministic assistant answer.");
      return fallback;
    }

    return polished;
  } catch (error) {
    warnGemini("api_error", getErrorMessage(error));
    return fallback;
  }
}

export async function getBorrowerAssistantFallbackReply(input: {
  prompt: string;
  fallback: string;
}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    warnGemini("missing_key", "Skipping fallback classification request.");
    return input.fallback;
  }

  try {
    warnGemini("attempt", "Checking unknown prompt against LendFolio scope.");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildFallbackPrompt(input.prompt, input.fallback),
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 260,
      },
    });
    const reply = response.text?.trim();

    if (!reply || !isUsableFallbackReply(reply, input.fallback)) {
      warnGemini("unusable_response", "Using LendFolio-only fallback.");
      return input.fallback;
    }

    return reply;
  } catch (error) {
    warnGemini("api_error", getErrorMessage(error));
    return input.fallback;
  }
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function warnGemini(reason: string, detail: string) {
  if (process.env.NODE_ENV !== "development") return;

  console.warn(`${GEMINI_LOG_PREFIX} ${reason}: ${detail}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown Gemini request failure.";
}

function isUsablePolishedReply(
  polished: string,
  summary: BorrowerAssistantSafeSummary,
) {
  const normalizedPolished = normalizeAssistantText(polished);
  const normalizedRuleBasedAnswer = normalizeAssistantText(summary.ruleBasedAnswer);

  if (!normalizedPolished) return false;
  if (normalizedPolished.length < MIN_POLISHED_REPLY_LENGTH) return false;
  if (polished.trim().endsWith(",")) return false;
  if (normalizedPolished === normalizedRuleBasedAnswer) return true;
  if (looksLikeFragment(polished)) return false;
  if (looksGenericWithoutAnswer(normalizedPolished, summary)) return false;
  if (!preservesImportantContext(normalizedPolished, summary)) return false;

  return true;
}

function isUsableFallbackReply(reply: string, fallback: string) {
  const normalizedReply = normalizeAssistantText(reply);

  if (!normalizedReply) return false;
  if (normalizedReply === normalizeAssistantText(fallback)) return true;
  if (normalizedReply.length < MIN_POLISHED_REPLY_LENGTH) return false;
  if (reply.trim().endsWith(",")) return false;
  if (looksLikeFragment(reply)) return false;
  if (mentionsUnsupportedAdvice(normalizedReply)) return false;

  return [
    "lendfolio",
    "borrower",
    "loan application",
    "application",
    "offer",
    "profile",
    "credit limit",
    "verification",
  ].some((term) => normalizedReply.includes(term));
}

function normalizeAssistantText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function looksLikeFragment(value: string) {
  const trimmed = value.trim();
  const firstCharacter = trimmed.charAt(0);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  return (
    wordCount < 8 ||
    /^[a-z]/.test(firstCharacter) ||
    !/[.!?)]$/.test(trimmed) ||
    /^(profile|offers?|options?|application|verification|credit limit)\.?$/i.test(
      trimmed,
    )
  );
}

function looksGenericWithoutAnswer(
  normalizedPolished: string,
  summary: BorrowerAssistantSafeSummary,
) {
  const genericPhrases = [
    "i can help you",
    "here's a summary",
    "here is a summary",
    "summary of your current options",
    "your current options",
    "review your options",
  ];
  const hasGenericPhrase = genericPhrases.some((phrase) =>
    normalizedPolished.includes(phrase),
  );

  if (
    normalizedPolished.includes("summary of your current options") &&
    summary.offers.length > 0 &&
    !summary.offers.some((offer) =>
      normalizedPolished.includes(normalizeAssistantText(offer.lenderDisplayName)),
    )
  ) {
    return true;
  }

  return hasGenericPhrase && normalizedPolished.length < 120;
}

function preservesImportantContext(
  normalizedPolished: string,
  summary: BorrowerAssistantSafeSummary,
) {
  const normalizedRuleBasedAnswer = normalizeAssistantText(summary.ruleBasedAnswer);
  const importantTerms = collectImportantTerms(summary, normalizedRuleBasedAnswer);

  return importantTerms.every((term) => normalizedPolished.includes(term));
}

function collectImportantTerms(
  summary: BorrowerAssistantSafeSummary,
  normalizedRuleBasedAnswer: string,
) {
  const terms = new Set<string>();
  const pesoAmounts = normalizedRuleBasedAnswer.match(/₱[\d,]+(?:\.\d+)?/g) ?? [];
  const percentages = normalizedRuleBasedAnswer.match(/\d+(?:\.\d+)?%/g) ?? [];

  for (const value of [...pesoAmounts, ...percentages]) {
    terms.add(value.toLowerCase());
  }

  for (const offer of summary.offers.slice(0, 3)) {
    const lenderName = normalizeAssistantText(offer.lenderDisplayName);
    if (lenderName && normalizedRuleBasedAnswer.includes(lenderName)) {
      terms.add(lenderName);
    }
  }

  for (const action of summary.profileNextActions.slice(0, 2)) {
    const firstImportantWords = normalizeAssistantText(action)
      .split(" ")
      .filter((word) => word.length > 3)
      .slice(0, 3);

    for (const word of firstImportantWords) {
      if (normalizedRuleBasedAnswer.includes(word)) terms.add(word);
    }
  }

  for (const keyword of [
    "profile",
    "verification",
    "apply",
    "application",
    "credit limit",
    "available credit",
  ]) {
    if (normalizedRuleBasedAnswer.includes(keyword)) {
      terms.add(keyword);
    }
  }

  return [...terms];
}

function mentionsUnsupportedAdvice(normalizedReply: string) {
  return [
    "outside lendfolio",
    "bank account",
    "credit card",
    "stock",
    "investment",
    "crypto",
    "legal advice",
    "medical",
    "tax advice",
  ].some((term) => normalizedReply.includes(term));
}

function buildGeminiPrompt(summary: BorrowerAssistantSafeSummary) {
  return `You are a borrower support assistant for LendFolio.
Use only the provided summary.
Do not invent offers, amounts, lenders, dates, or statuses.
Do not provide legal or financial guarantees.
Do not expose internal IDs or sensitive details.
Keep the answer concise and borrower-friendly.
Tell the borrower to review full offer details before accepting.
Return one complete answer only.
Do not output sentence fragments, headings without details, or unfinished sentences.
Do not shorten the answer so much that lender names, recommendations, amounts, rates, fees, dates, blockers, or next actions are lost.
Preserve the exact recommendation and all financial values from the rule-based answer.
Return the rule-based answer rewritten, not a new answer.
If you cannot produce a complete helpful rewrite, return the rule-based answer exactly.

Rewrite the already-calculated rule-based answer in clearer borrower-friendly language. The deterministic rule-based answer is the source of truth. Do not change the offer ranking, best offer selection, profile blockers, credit limit explanation, or borrower next action.

Provided summary:
${JSON.stringify(summary, null, 2)}`;
}

function buildFallbackPrompt(prompt: string, fallback: string) {
  return `You are the borrower support assistant inside LendFolio.
Answer only questions related to LendFolio borrower workflows: borrower profile, borrower verification, loan applications, credit limits, lender offers, accepted offers, active loans, and repayment proofs.
Do not answer unrelated questions.
Do not invent user-specific application, offer, lender, loan, amount, status, or date details.
Do not provide legal, tax, investment, or financial guarantees.
Return one complete helpful answer only.
Do not output sentence fragments or unfinished sentences.
If the question is not clearly about LendFolio borrower workflows, return this fallback exactly:
${fallback}

User question:
${prompt}`;
}
