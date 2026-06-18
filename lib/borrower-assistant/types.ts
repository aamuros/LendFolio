import type { BorrowerTab } from "@/components/borrower-bottom-tabs";

export type BorrowerAssistantAction =
  | {
      type: "tab";
      label: string;
      tab: BorrowerTab;
    }
  | {
      type: "verification";
      label: string;
    };

export type BorrowerAssistantReply = {
  content: string;
  actions?: BorrowerAssistantAction[];
};

export type BorrowerAssistantSafeOfferSummary = {
  lenderDisplayName: string;
  principalAmount: number;
  totalRepayment: number;
  fees: number;
  serviceChargeRate: number | null;
  dueDate: string;
  status: string;
};

export type BorrowerAssistantSafeSummary = {
  ruleBasedAnswer: string;
  promptTopic: string;
  offers: BorrowerAssistantSafeOfferSummary[];
  creditSummary: {
    calculatedCreditLimit: number;
    usedCredit: number;
    availableCredit: number;
    safeMonthlyRepaymentCapacity: number;
  } | null;
  profileNextActions: string[];
};
