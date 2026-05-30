"use client";

import { useEffect, useState, useTransition } from "react";
import {
  loadBorrowerPortfolio,
  loadBorrowerLoanApplications,
  type LoanApplicationsLoadResult,
} from "@/app/borrower/actions";
import { signOutAction } from "@/app/login/actions";
import {
  BorrowerBottomTabs,
  type BorrowerTab,
} from "@/components/borrower-bottom-tabs";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { BorrowerProfileHub } from "./borrower/profile/borrower-profile-hub";
import { ProfileSubviewHeader } from "./borrower/profile/profile-subview";
import { User, LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { borrowerPageBottomPadding } from "@/components/borrower/ui";

import { NotificationButton } from "@/components/notification-button";
import { type BorrowerPortfolioInput } from "@/lib/borrower-portfolio";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import { type BorrowerCreditSummary } from "@/lib/credit-limit";

type ProfileMode =
  | "index"
  | "edit"
  | "business"
  | "financial"
  | "borrowingPower"
  | "verification"
  | "account"
  | "support";
type PortfolioLoadState = "loading" | "ready" | "empty" | "error";

type BorrowerWorkspaceProps = {
  accountEmail?: string;
  initialLoanApplications?: LoanApplicationsLoadResult | null;
  initialTab?: BorrowerTab;
  highlightOfferId?: string | null;
  highlightApplicationId?: string | null;
  highlightLoanId?: string | null;
  highlightRepaymentId?: string | null;
  highlightProofId?: string | null;
};

const desktopTabs: { id: BorrowerTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "apply", label: "Apply" },
  { id: "offers", label: "Offers" },
  { id: "loans", label: "Loans" },
];

export function BorrowerWorkspace({
  accountEmail = "",
  initialLoanApplications = null,
  initialTab = "home",
  highlightOfferId = null,
  highlightApplicationId = null,
  highlightLoanId = null,
  highlightRepaymentId = null,
  highlightProofId = null,
}: BorrowerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BorrowerTab>(initialTab);
  const [profileMode, setProfileMode] = useState<ProfileMode>("index");
  const [editReturnMode, setEditReturnMode] = useState<ProfileMode>("index");
  const [portfolioLoadState, setPortfolioLoadState] =
    useState<PortfolioLoadState>("loading");
  const [portfolio, setPortfolio] = useState<BorrowerPortfolioInput | null>(
    null,
  );
  const [portfolioMessage, setPortfolioMessage] = useState("");
  const [, startTransition] = useTransition();
  const [creditSummary, setCreditSummary] =
    useState<BorrowerCreditSummary | null>(
      initialLoanApplications?.creditSummary ?? null,
    );
  const [readiness, setReadiness] = useState<BorrowerReadinessResult | null>(
    initialLoanApplications?.readiness ?? null,
  );
  const workspaceTab = activeTab === "profile" ? "home" : activeTab;

  useEffect(() => {
    let isActive = true;

    function loadCreditSummary() {
      startTransition(() => {
        void loadBorrowerLoanApplications().then((result) => {
          if (!isActive) {
            return;
          }

          setCreditSummary(result.creditSummary);
          setReadiness(result.readiness);
        });
      });
    }

    window.addEventListener(borrowerPortfolioSavedEvent, loadCreditSummary);

    return () => {
      isActive = false;
      window.removeEventListener(borrowerPortfolioSavedEvent, loadCreditSummary);
    };
  }, [startTransition]);

  useEffect(() => {
    if (activeTab !== "profile") {
      return;
    }

    let isActive = true;

    startTransition(() => {
      void loadBorrowerLoanApplications().then((result) => {
        if (!isActive) {
          return;
        }

        setCreditSummary(result.creditSummary);
        setReadiness(result.readiness);
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, startTransition]);

  function changeTab(tab: BorrowerTab) {
    setActiveTab(tab);
    if (tab !== "profile") {
      setProfileMode("index");
    }
  }

  useEffect(() => {
    if (activeTab !== "profile") {
      return;
    }

    let isActive = true;

    startTransition(() => {
      void loadBorrowerPortfolio().then((result) => {
        if (!isActive) {
          return;
        }

        if (result.ok && result.data) {
          setPortfolio(result.data);
          setPortfolioLoadState("ready");
          setPortfolioMessage("");
          return;
        }

        setPortfolio(null);
        setPortfolioLoadState(result.ok ? "empty" : "error");
        setPortfolioMessage(result.message);
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, startTransition]);

  function openProfileEdit(returnMode: ProfileMode = "index") {
    setEditReturnMode(returnMode);
    setProfileMode("edit");
    requestAnimationFrame(() => {
      document
        .getElementById("business-profile-edit")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handlePortfolioSaved(savedPortfolio: BorrowerPortfolioInput) {
    setPortfolio(savedPortfolio);
    setPortfolioLoadState("ready");
    setPortfolioMessage("");
    setProfileMode(editReturnMode);
  }

  const showProfile = activeTab === "profile";

  return (
    <div className={cn("grid", borrowerPageBottomPadding)}>
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-6">
            <p className="text-base font-semibold tracking-tight text-foreground">
              LendFolio
            </p>
            <Tabs
              value={showProfile ? "" : activeTab}
              onValueChange={(value) => changeTab(value as BorrowerTab)}
              className="hidden sm:block"
            >
              <TabsList variant="line">
                {desktopTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open profile menu"
                  className={cn(
                    "rounded-full text-muted-foreground hover:text-foreground",
                    showProfile && "bg-muted text-foreground",
                  )}
                >
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-semibold">
                  {accountEmail || "Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setActiveTab("profile");
                    setProfileMode("index");
                  }}
                >
                  <UserCircle className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      (e.target as HTMLElement).closest("form")?.requestSubmit();
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8">
        {showProfile ? (
          <section>
            {profileMode === "edit" ? (
              <div id="business-profile-edit" className="grid gap-6">
                <ProfileSubviewHeader
                  title="Edit Profile"
                  description="Keep your business and loan-use details current."
                  onBack={() => setProfileMode(editReturnMode)}
                />
                <BorrowerPortfolioForm
                  onCancel={() => setProfileMode(editReturnMode)}
                  onSaved={handlePortfolioSaved}
                />
              </div>
            ) : (
              <BorrowerProfileHub
                accountEmail={accountEmail}
                activeView={profileMode}
                creditSummary={creditSummary}
                loadState={portfolioLoadState}
                message={portfolioMessage}
                onEditProfile={openProfileEdit}
                onNavigateHome={() => changeTab("home")}
                onProfileViewChange={setProfileMode}
                portfolio={portfolio}
                readiness={readiness}
                result={initialLoanApplications}
              />
            )}
          </section>
        ) : (
          <BorrowerLoanApplicationPanel
            view={workspaceTab}
            onNavigate={changeTab}
            initialLoadResult={initialLoanApplications}
            highlightOfferId={highlightOfferId}
            highlightApplicationId={highlightApplicationId}
            highlightLoanId={highlightLoanId}
            highlightRepaymentId={highlightRepaymentId}
            highlightProofId={highlightProofId}
          />
        )}
      </div>

      <div className="sm:hidden">
        <BorrowerBottomTabs activeTab={activeTab} onTabChange={changeTab} />
      </div>
    </div>
  );
}
