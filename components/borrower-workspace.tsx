"use client";

import { useEffect, useState, useTransition } from "react";
import {
  loadBorrowerPortfolio,
  loadBorrowerLoanApplications,
  type LoanApplicationsLoadResult,
} from "@/app/borrower/actions";
import {
  BorrowerBottomTabs,
  type BorrowerTab,
} from "@/components/borrower-bottom-tabs";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { BorrowerProfileHub } from "./borrower/profile/borrower-profile-hub";
import { ProfileSubviewHeader } from "./borrower/profile/profile-subview";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

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
};

export function BorrowerWorkspace({
  accountEmail = "",
  initialLoanApplications = null,
}: BorrowerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BorrowerTab>("home");
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

  return (
    <div className="grid gap-5 pb-28 sm:pb-32">
      {activeTab === "profile" ? null : (
        <header className="flex min-h-10 items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            LendFolio
          </p>
          <div className="flex items-center gap-2">
            <NotificationButton />
            <Button
              variant="outline"
              size="icon"
              aria-label="Open profile"
              onClick={() => changeTab("profile")}
              className="rounded-full shadow-sm text-foreground hover:text-primary"
            >
              <User className="size-5" />
            </Button>
          </div>
        </header>
      )}

      {activeTab === "profile" ? (
        <section className="grid gap-4">
          {profileMode === "edit" ? (
            <div id="business-profile-edit">
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
        />
      )}

      <BorrowerBottomTabs activeTab={activeTab} onTabChange={changeTab} />
    </div>
  );
}

