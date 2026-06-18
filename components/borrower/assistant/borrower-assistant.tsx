"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import type {
  BorrowerLoanApplicationSummary,
  LoanApplicationsLoadResult,
} from "@/app/borrower/actions";
import type { BorrowerTab } from "@/components/borrower-bottom-tabs";
import { answerOfferComparison } from "@/lib/borrower-assistant/offer-ranking";
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
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "Best offer",
  "Compare offers",
  "Complete profile",
  "Why can't I apply?",
  "Explain my credit limit",
];

export function BorrowerAssistant({
  activeTab,
  applications,
  creditSummary,
  readiness,
  result,
  selectedApplicationId = null,
}: BorrowerAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi, I can help compare offers, explain your credit limit, or guide your borrower workflow.",
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

  function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const answer = answerPrompt(trimmedPrompt, {
      applications,
      creditSummary,
      readiness,
      result,
      selectedApplicationId: selectedApplicationForTab,
    });

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", content: trimmedPrompt },
      { id: Date.now() + 1, role: "assistant", content: answer },
    ]);
    setDraft("");
    setIsOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(draft);
  }

  return (
    <>
      <Button
        type="button"
        className={cn(
          "fixed right-4 z-40 gap-2 rounded-full shadow-lg sm:right-6",
          "bottom-24 sm:bottom-6",
        )}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-4 w-4" />
        Ask LendFolio
      </Button>

      {isOpen ? (
        <Card
          className={cn(
            "fixed z-50 flex max-h-[calc(100svh-6rem)] flex-col border-border/80 shadow-2xl",
            "inset-x-3 bottom-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[620px] sm:w-[380px]",
          )}
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
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
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
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
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {message.content}
                  </div>
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
      ) : null}
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
) {
  const normalizedPrompt = prompt.toLowerCase().replace(/[?!.]/g, "").trim();

  if (
    normalizedPrompt.includes("best offer") ||
    normalizedPrompt.includes("compare offer")
  ) {
    return answerOfferComparison({
      applications: context.applications,
      selectedApplicationId: context.selectedApplicationId,
    });
  }

  if (
    normalizedPrompt.includes("complete profile") ||
    normalizedPrompt.includes("profile details")
  ) {
    return answerCompleteProfile({
      result: context.result,
      readiness: context.readiness,
    });
  }

  if (
    normalizedPrompt.includes("why cant i apply") ||
    normalizedPrompt.includes("why can't i apply") ||
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

  return "I can help compare offers, explain your credit limit, or guide you through completing your borrower profile.";
}
