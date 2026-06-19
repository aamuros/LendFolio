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
import { BorrowerAssistant } from "@/components/borrower/assistant/borrower-assistant";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { BorrowerProfileHub } from "./borrower/profile/borrower-profile-hub";
import { ProfileSubviewHeader } from "./borrower/profile/profile-subview";
import { AppHeader, type AppHeaderNavItem } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { borrowerPageBottomPadding } from "@/components/borrower/ui";

import {
  getNextIncompleteBorrowerPortfolioStep,
  getBusinessProfileSectionStep,
  isBorrowerPortfolioComplete,
  type BusinessProfileSection,
  type BorrowerPortfolioInput,
  type BorrowerPortfolioStep,
} from "@/lib/borrower-portfolio";
import {
  borrowerPortfolioSavedEvent,
  borrowerVerificationUpdatedEvent,
} from "@/lib/borrower-workflow-events";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import type { BorrowerVerificationSummary } from "@/lib/borrower-verification";
import { type BorrowerCreditSummary } from "@/lib/credit-limit";
import type { ConsentStatus } from "@/lib/consents";

type ProfileMode =
  | "index"
  | "complete"
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
  initialLoanMessage?: string;
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
  initialLoanMessage = "",
}: BorrowerWorkspaceProps) {
  const initialPortfolio = initialLoanApplications?.borrowerPortfolio ?? null;
  const [activeTab, setActiveTab] = useState<BorrowerTab>(initialTab);
  const [profileMode, setProfileMode] = useState<ProfileMode>("index");
  const [editReturnMode, setEditReturnMode] = useState<ProfileMode>("index");
  const [editInitialStep, setEditInitialStep] =
    useState<BorrowerPortfolioStep>();
  const [editBusinessSection, setEditBusinessSection] =
    useState<BusinessProfileSection>();
  const [portfolioLoadState, setPortfolioLoadState] =
    useState<PortfolioLoadState>(
      getInitialPortfolioLoadState(initialLoanApplications, initialPortfolio),
    );
  const [portfolio, setPortfolio] = useState<BorrowerPortfolioInput | null>(
    initialPortfolio,
  );
  const [portfolioMessage, setPortfolioMessage] = useState(
    initialLoanApplications?.ok === false ? initialLoanApplications.message : "",
  );
  const [, startTransition] = useTransition();
  const [creditSummary, setCreditSummary] =
    useState<BorrowerCreditSummary | null>(
      initialLoanApplications?.creditSummary ?? null,
    );
  const [readiness, setReadiness] = useState<BorrowerReadinessResult | null>(
    initialLoanApplications?.readiness ?? null,
  );
  const [borrowerVerification, setBorrowerVerification] =
    useState<BorrowerVerificationSummary | null>(
      initialLoanApplications?.borrowerVerification ?? null,
    );
  const [consentStatuses, setConsentStatuses] = useState<{
    borrowerDocumentUpload: ConsentStatus;
    borrowerLoanApplication: ConsentStatus;
  } | null>(initialLoanApplications?.consentStatuses ?? null);
  const hasSavedPortfolioRef = useRef(portfolio !== null);
  const skipInitialProfileRefreshRef = useRef(
    activeTab === "profile" && initialLoanApplications !== null,
  );
  const [postSaveVerification, setPostSaveVerification] = useState(false);
  const workspaceTab = activeTab === "profile" ? "home" : activeTab;

  function applyBorrowerLoanState(result: LoanApplicationsLoadResult) {
    setCreditSummary(result.creditSummary);
    setReadiness(result.readiness);
    setBorrowerVerification(result.borrowerVerification);
    setConsentStatuses(result.consentStatuses);

    if (result.borrowerPortfolio) {
      setPortfolio(result.borrowerPortfolio);
      setPortfolioLoadState("ready");
      setPortfolioMessage("");
      return;
    }

    if (result.ok) {
      setPortfolio(null);
      setPortfolioLoadState("empty");
      setPortfolioMessage("");
      return;
    }

    setPortfolio(null);
    setPortfolioLoadState("error");
    setPortfolioMessage(result.message);
  }

  function refreshBorrowerLoanState() {
    startTransition(() => {
      void loadBorrowerLoanApplications().then((result) => {
        applyBorrowerLoanState(result);
      });
    });
  }

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

          applyBorrowerLoanState(result);
        });
      });
    }

    window.addEventListener(borrowerPortfolioSavedEvent, loadCreditSummary);
    window.addEventListener(borrowerVerificationUpdatedEvent, loadCreditSummary);

    return () => {
      isActive = false;
      window.removeEventListener(borrowerPortfolioSavedEvent, loadCreditSummary);
      window.removeEventListener(
        borrowerVerificationUpdatedEvent,
        loadCreditSummary,
      );
    };
  }, [startTransition]);

  useEffect(() => {
    if (activeTab !== "profile") {
      return;
    }

    if (skipInitialProfileRefreshRef.current) {
      skipInitialProfileRefreshRef.current = false;
      return;
    }

    let isActive = true;

    startTransition(() => {
      void loadBorrowerLoanApplications().then((result) => {
        if (!isActive) {
          return;
        }

        applyBorrowerLoanState(result);
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
    if (activeTab !== "profile" || portfolioLoadState !== "loading") {
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
  }, [activeTab, portfolioLoadState, startTransition]);

  function openProfileEdit(
    returnMode: ProfileMode = "index",
    businessSection?: BusinessProfileSection,
  ) {
    setPostSaveVerification(false);
    setEditReturnMode(returnMode);
    setEditBusinessSection(businessSection);
    setEditInitialStep(
      businessSection
        ? getBusinessProfileSectionStep(businessSection)
        : resolveEditInitialStep(returnMode, portfolio),
    );
    setProfileMode("edit");
    requestAnimationFrame(() => {
      document
        .getElementById("business-profile-edit")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openProfileCompletion() {
    setPostSaveVerification(false);
    setEditReturnMode("index");
    setEditBusinessSection(undefined);
    setEditInitialStep(getNextIncompleteBorrowerPortfolioStep(portfolio));
    setProfileMode("complete");
    requestAnimationFrame(() => {
      document
        .getElementById("borrower-profile-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handlePortfolioSaved(savedPortfolio: BorrowerPortfolioInput) {
    setPortfolio(savedPortfolio);
    setPortfolioLoadState("ready");
    setPortfolioMessage("");
    hasSavedPortfolioRef.current = true;

    const verificationStatus = borrowerVerification?.status ?? null;
    const needsVerification =
      verificationStatus !== null && verificationStatus !== "approved";

    if (needsVerification && isBorrowerPortfolioComplete(savedPortfolio)) {
      setPostSaveVerification(true);
    }

    setProfileMode(editReturnMode);
  }

  const showProfile = activeTab === "profile";

  function handleProfileViewChange(view: ProfileMode) {
    setPostSaveVerification(false);
    setProfileMode(view);
    if (view === "index") {
      refreshBorrowerLoanState();
    }
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
            {profileMode === "edit" || profileMode === "complete" ? (
              <div id="borrower-profile-form" className="grid gap-6">
                <ProfileSubviewHeader
                  title={
                    profileMode === "complete"
                      ? "Finish your profile"
                      : editReturnMode === "business"
                      ? "Edit Business Profile"
                      : "Edit Profile"
                  }
                  description={
                    profileMode === "complete"
                      ? "Complete the required profile sections before applying."
                      : editReturnMode === "business"
                      ? "Update this business profile section."
                      : "Keep your business and loan-use details current."
                  }
                  onBack={() =>
                    setProfileMode(
                      profileMode === "complete" ? "index" : editReturnMode,
                    )
                  }
                />
                <BorrowerPortfolioForm
                  borrowerVerification={borrowerVerification}
                  businessSection={
                    profileMode === "edit" ? editBusinessSection : undefined
                  }
                  initialStep={editInitialStep}
                  mode={profileMode === "complete" ? "completion" : "edit"}
                  onCancel={() =>
                    setProfileMode(
                      profileMode === "complete" ? "index" : editReturnMode,
                    )
                  }
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
                onCompleteProfile={openProfileCompletion}
                onNavigateHome={() => changeTab("home")}
                onProfileViewChange={handleProfileViewChange}
                portfolio={portfolio}
                postSaveVerification={postSaveVerification}
                readiness={readiness}
                verification={borrowerVerification}
                documentConsentStatus={consentStatuses?.borrowerDocumentUpload ?? null}
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
            initialSuccessMessage={initialLoanMessage}
          />
        )}
      </div>

      <div className="sm:hidden">
        <BorrowerBottomTabs activeTab={activeTab} onTabChange={changeTab} />
      </div>

      {!showProfile ? (
        <BorrowerAssistant
          activeTab={workspaceTab}
          applications={initialLoanApplications?.applications ?? []}
          creditSummary={creditSummary}
          readiness={readiness}
          result={initialLoanApplications}
          selectedApplicationId={highlightApplicationId}
          onNavigate={changeTab}
          onNavigateVerification={navigateToVerification}
        />
      ) : null}
    </div>
  );
}

function getInitialPortfolioLoadState(
  initialLoanApplications: LoanApplicationsLoadResult | null,
  initialPortfolio: BorrowerPortfolioInput | null,
): PortfolioLoadState {
  if (initialPortfolio) {
    return "ready";
  }

  if (!initialLoanApplications) {
    return "loading";
  }

  return initialLoanApplications.ok ? "empty" : "error";
}

function resolveEditInitialStep(
  returnMode: ProfileMode,
  portfolio: BorrowerPortfolioInput | null,
): BorrowerPortfolioStep {
  if (returnMode === "business") return "businessBasics";
  if (returnMode === "financial" || returnMode === "borrowingPower") {
    return "financials";
  }

  if (portfolio && isBorrowerPortfolioComplete(portfolio)) {
    return "businessBasics";
  }

  return getNextIncompleteBorrowerPortfolioStep(portfolio);
}
