"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import {
  getBorrowerAssistantFallbackReply,
  polishBorrowerAssistantReply,
} from "@/app/borrower/assistant/actions";
import type {
  BorrowerLoanApplicationSummary,
  LoanApplicationsLoadResult,
} from "@/app/borrower/actions";
import type { BorrowerTab } from "@/components/borrower-bottom-tabs";
import { answerOfferComparison } from "@/lib/borrower-assistant/offer-ranking";
import type {
  BorrowerAssistantAction,
  BorrowerAssistantReply,
  BorrowerAssistantSafeSummary,
} from "@/lib/borrower-assistant/types";
import {
  answerApplyBlockers,
  answerCompleteProfile,
  answerCreditLimit,
} from "@/lib/borrower-assistant/workflow-help";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import type { BorrowerCreditSummary } from "@/lib/credit-limit";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type BorrowerAssistantProps = {
  activeTab: BorrowerTab;
  applications: BorrowerLoanApplicationSummary[];
  creditSummary: BorrowerCreditSummary | null;
  readiness: BorrowerReadinessResult | null;
  result: LoanApplicationsLoadResult | null;
  selectedApplicationId?: string | null;
  onNavigate: (tab: BorrowerTab) => void;
  onNavigateVerification: () => void;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
  actions?: BorrowerAssistantAction[];
  isPending?: boolean;
};

const quickPrompts = [
  "Best offer",
  "Compare offers",
  "Complete profile",
  "Why can't I apply?",
  "Explain my credit limit",
];
const OUT_OF_SCOPE_REPLY =
  "I can only help with LendFolio borrower questions, such as comparing offers, checking your credit limit, completing your profile, or submitting a loan application. Try asking 'How do I apply?' or 'Best offer'.";

export function BorrowerAssistant({
  activeTab,
  applications,
  creditSummary,
  readiness,
  result,
  selectedApplicationId = null,
  onNavigate,
  onNavigateVerification,
}: BorrowerAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const nextMessageId = useRef(2);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi, I can help compare offers, explain your credit limit, or guide your borrower profile.",
    },
  ]);
  const selectedApplicationForTab = useMemo(() => {
    if (selectedApplicationId) return selectedApplicationId;

    if (activeTab === "offers") {
      const applicationWithPendingOffers = applications.find((application) =>
        application.offers.some((offer) => offer.status === "pending"),
      );

      return applicationWithPendingOffers?.id ?? null;
    }

    return null;
  }, [activeTab, applications, selectedApplicationId]);

  async function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const localReply = answerGenericPrompt(trimmedPrompt);
    const answer =
      localReply ??
      answerPrompt(trimmedPrompt, {
        applications,
        creditSummary,
        readiness,
        result,
        selectedApplicationId: selectedApplicationForTab,
      });
    const safeSummary = buildSafeSummary(trimmedPrompt, answer.content, {
      applications,
      creditSummary,
      readiness,
      selectedApplicationId: selectedApplicationForTab,
    });
    const userMessageId = nextMessageId.current;
    const assistantMessageId = nextMessageId.current + 1;
    nextMessageId.current += 2;

    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: trimmedPrompt },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "Thinking...",
        actions: answer.actions,
        isPending: true,
      },
    ]);
    setDraft("");
    setIsOpen(true);

    if (localReply) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: answer.content,
                isPending: false,
              }
            : message,
        ),
      );
      return;
    }

    const finalContent =
      answer.content === OUT_OF_SCOPE_REPLY
        ? await getBorrowerAssistantFallbackReply({
            prompt: trimmedPrompt,
            fallback: OUT_OF_SCOPE_REPLY,
          })
        : shouldPolishReply(trimmedPrompt, answer.content)
          ? await polishBorrowerAssistantReply(safeSummary)
          : answer.content;

    setMessages((current) =>
      current.map((message) =>
        message.id === assistantMessageId
          ? {
              ...message,
              content: finalContent,
              isPending: false,
            }
          : message,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(draft);
  }

  function handleAction(action: BorrowerAssistantAction) {
    setIsOpen(false);

    if (action.type === "verification") {
      onNavigateVerification();
      return;
    }

    onNavigate(action.tab);
  }

  return (
    <>
      <Button
        type="button"
        className={cn(
          "fixed right-4 z-40 h-10 transform-gpu gap-2 rounded-full px-4 shadow-lg will-change-transform motion-reduce:transition-none sm:right-6",
          "bottom-[var(--app-assistant-button-bottom,6rem)] sm:bottom-6",
          "translate-y-[var(--app-assistant-button-y,0px)] sm:translate-y-0",
        )}
        style={{
          transition:
            "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-4 w-4" />
        Ask LendFolio
      </Button>

      <div
        className={cn(
          "pointer-events-none fixed z-50",
          "inset-x-3 bottom-[var(--app-assistant-panel-bottom,5rem)] sm:inset-auto sm:bottom-6 sm:right-6",
          "translate-y-[var(--app-assistant-panel-y,0px)] sm:translate-y-0",
        )}
        style={{
          transition:
            "transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className={cn(
            "transform-gpu will-change-transform motion-reduce:transition-none",
            isOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0",
          )}
          style={{
            transition:
              "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease",
          }}
          aria-hidden={!isOpen}
        >
        <Card
          className={cn(
            "flex max-h-[calc(100svh-7rem)] flex-col overflow-hidden border-border/80 shadow-2xl",
            "sm:h-[560px] sm:w-[360px]",
          )}
        >
          <CardHeader className="space-y-3 p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Ask LendFolio</CardTitle>
                  <CardDescription className="mt-1 text-xs leading-relaxed">
                    Get help comparing offers and completing your borrower
                    workflow.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setIsOpen(false)}
                aria-label="Close Ask LendFolio"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs"
                  onClick={() => submitPrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-2",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      message.isPending && "text-muted-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" && message.actions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        <Button
                          key={`${message.id}-${action.label}`}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 rounded-full px-3 text-xs"
                          onClick={() => handleAction(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <Separator />
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 p-3"
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about offers or credit..."
                aria-label="Ask LendFolio message"
              />
              <Button type="submit" size="icon" aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}

function answerPrompt(
  prompt: string,
  context: {
    applications: BorrowerLoanApplicationSummary[];
    creditSummary: BorrowerCreditSummary | null;
    readiness: BorrowerReadinessResult | null;
    result: LoanApplicationsLoadResult | null;
    selectedApplicationId: string | null;
  },
): BorrowerAssistantReply {
  const normalizedPrompt = prompt.toLowerCase().replace(/[?!.]/g, "").trim();
  const promptWords = normalizedPrompt.split(/\s+/).filter(Boolean);

  const mentionsOffers =
    normalizedPrompt.includes("best offer") ||
    normalizedPrompt.includes("compare offer") ||
    normalizedPrompt.includes("what are my options") ||
    normalizedPrompt.includes("current options") ||
    normalizedPrompt.includes("loan options") ||
    normalizedPrompt.includes("offers available") ||
    normalizedPrompt.includes("available offers") ||
    normalizedPrompt.includes("which one should i choose") ||
    normalizedPrompt.includes("which offer should i choose") ||
    normalizedPrompt.includes("what should i choose") ||
    normalizedPrompt.includes("choose offer") ||
    promptWords.includes("offers");

  if (mentionsOffers) {
    return answerOfferComparison({
      applications: context.applications,
      selectedApplicationId: context.selectedApplicationId,
    });
  }

  const asksHowToApply =
    normalizedPrompt.includes("how to apply") ||
    normalizedPrompt.includes("how can i apply") ||
    normalizedPrompt.includes("how do i apply") ||
    normalizedPrompt.includes("how to make a loan application") ||
    normalizedPrompt.includes("make a loan application") ||
    normalizedPrompt.includes("create a loan application") ||
    normalizedPrompt.includes("start a loan application") ||
    normalizedPrompt.includes("loan application") ||
    normalizedPrompt.includes("apply for loan") ||
    normalizedPrompt.includes("apply for a loan") ||
    normalizedPrompt.includes("borrow money") ||
    normalizedPrompt.includes("get a loan") ||
    normalizedPrompt.includes("submit application");

  if (asksHowToApply) {
    return answerApplyBlockers({
      result: context.result,
      readiness: context.readiness,
      creditSummary: context.creditSummary,
    });
  }

  const asksWorkflowHelp =
    normalizedPrompt.includes("what should i do next") ||
    normalizedPrompt.includes("next step") ||
    normalizedPrompt === "help me" ||
    normalizedPrompt.includes("help me ") ||
    normalizedPrompt.includes("need help");

  if (asksWorkflowHelp) {
    return answerCompleteProfile({
      result: context.result,
      readiness: context.readiness,
    });
  }

  if (
    normalizedPrompt.includes("complete profile") ||
    normalizedPrompt.includes("profile details") ||
    normalizedPrompt.includes("finish profile") ||
    normalizedPrompt.includes("update profile")
  ) {
    return answerCompleteProfile({
      result: context.result,
      readiness: context.readiness,
    });
  }

  if (
    normalizedPrompt.includes("why cant i apply") ||
    normalizedPrompt.includes("why can't i apply") ||
    normalizedPrompt.includes("why can’t i apply") ||
    normalizedPrompt.includes("cannot apply")
  ) {
    return answerApplyBlockers({
      result: context.result,
      readiness: context.readiness,
      creditSummary: context.creditSummary,
    });
  }

  if (
    normalizedPrompt.includes("credit limit") ||
    normalizedPrompt.includes("available credit")
  ) {
    return answerCreditLimit({ creditSummary: context.creditSummary });
  }

  return {
    content: OUT_OF_SCOPE_REPLY,
  };
}

function answerGenericPrompt(prompt: string): BorrowerAssistantReply | null {
  const normalizedPrompt = prompt.toLowerCase().replace(/[?!.]/g, "").trim();
  const greetingPrompts = ["hello", "hi", "hey", "good morning", "good afternoon"];

  if (greetingPrompts.includes(normalizedPrompt)) {
    return {
      content:
        "Hi! I can help compare your offers, explain your credit limit, or guide you through completing your borrower profile.",
    };
  }

  if (
    !/[a-z]/.test(normalizedPrompt) ||
    /^(none|n\/a|na)$/.test(normalizedPrompt)
  ) {
    return {
      content: OUT_OF_SCOPE_REPLY,
    };
  }

  return null;
}

function shouldPolishReply(prompt: string, ruleBasedAnswer: string) {
  return (
    !answerGenericPrompt(prompt) &&
    ruleBasedAnswer !== OUT_OF_SCOPE_REPLY &&
    ruleBasedAnswer.length >= 50
  );
}

function buildSafeSummary(
  prompt: string,
  ruleBasedAnswer: string,
  context: {
    applications: BorrowerLoanApplicationSummary[];
    creditSummary: BorrowerCreditSummary | null;
    readiness: BorrowerReadinessResult | null;
    selectedApplicationId: string | null;
  },
): BorrowerAssistantSafeSummary {
  const selectedApplication = context.selectedApplicationId
    ? context.applications.find(
        (application) => application.id === context.selectedApplicationId,
      )
    : null;
  const sourceApplications = selectedApplication
    ? [selectedApplication]
    : context.applications;

  return {
    ruleBasedAnswer,
    promptTopic: getPromptTopic(prompt),
    offers: sourceApplications.flatMap((application) =>
      application.offers.slice(0, 5).map((offer) => ({
        lenderDisplayName: offer.lenderName,
        principalAmount: offer.principalAmount,
        totalRepayment: offer.totalRepaymentAmount,
        fees: offer.fees,
        serviceChargeRate: offer.interestServiceChargeRate,
        dueDate: offer.dueDate,
        status: offer.status,
      })),
    ),
    creditSummary: context.creditSummary
      ? {
          calculatedCreditLimit: context.creditSummary.calculatedCreditLimit,
          usedCredit: context.creditSummary.usedCredit,
          availableCredit: context.creditSummary.availableCredit,
          safeMonthlyRepaymentCapacity:
            context.creditSummary.safeMonthlyRepaymentCapacity,
        }
      : null,
    profileNextActions: context.readiness?.nextActions.slice(0, 4) ?? [],
  };
}

function getPromptTopic(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("offer")) return "offer comparison";
  if (normalizedPrompt.includes("credit")) return "credit limit";
  if (normalizedPrompt.includes("apply")) return "application readiness";
  if (normalizedPrompt.includes("profile")) return "profile completion";

  return "borrower workflow help";
}
