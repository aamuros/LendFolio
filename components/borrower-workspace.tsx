"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { AppHeader, type AppHeaderNavItem } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { borrowerPageBottomPadding } from "@/components/borrower/ui";

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

const desktopTabs: AppHeaderNavItem[] = [
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
  const hasSavedPortfolioRef = useRef(portfolio !== null);
  const [postSaveVerification, setPostSaveVerification] = useState(false);
  const workspaceTab = activeTab === "profile" ? "home" : activeTab;

  function navigateToVerification() {
    setPostSaveVerification(false);
    setActiveTab("profile");
    setProfileMode("verification");
  }

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
    setPostSaveVerification(false);
    if (tab !== "profile") {
      setProfileMode("index");
    }

    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
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
    setPostSaveVerification(false);
    setEditReturnMode(returnMode);
    setProfileMode("edit");
    requestAnimationFrame(() => {
      document
        .getElementById("business-profile-edit")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handlePortfolioSaved(savedPortfolio: BorrowerPortfolioInput) {
    const wasEmpty = !hasSavedPortfolioRef.current;
    setPortfolio(savedPortfolio);
    setPortfolioLoadState("ready");
    setPortfolioMessage("");
    hasSavedPortfolioRef.current = true;

    const verificationStatus =
      initialLoanApplications?.borrowerVerification?.status ?? null;
    const needsVerification =
      verificationStatus !== null && verificationStatus !== "approved";

    if (needsVerification) {
      setPostSaveVerification(true);
    }

    if (wasEmpty) {
      setProfileMode("verification");
    } else {
      setProfileMode(editReturnMode);
    }
  }

  const showProfile = activeTab === "profile";

  function handleProfileViewChange(view: ProfileMode) {
    setPostSaveVerification(false);
    setProfileMode(view);
  }

  return (
    <div className={cn("grid", borrowerPageBottomPadding)}>
      <AppHeader
        navItems={desktopTabs}
        activeNavId={showProfile ? "" : activeTab}
        onNavChange={(id) => changeTab(id as BorrowerTab)}
        accountEmail={accountEmail}
        isAccountActive={showProfile}
        onAccountClick={() => changeTab("profile")}
        accountLabel="Profile"
      />

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
                onProfileViewChange={handleProfileViewChange}
                portfolio={portfolio}
                postSaveVerification={postSaveVerification}
                readiness={readiness}
                result={initialLoanApplications}
              />
            )}
          </section>
        ) : (
          <BorrowerLoanApplicationPanel
            view={workspaceTab}
            onNavigate={changeTab}
            onNavigateVerification={navigateToVerification}
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
