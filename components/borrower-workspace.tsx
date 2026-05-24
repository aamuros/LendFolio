"use client";

import { useState } from "react";
import {
  BorrowerBottomTabs,
  type BorrowerTab,
} from "@/components/borrower-bottom-tabs";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";

type BorrowerWorkspaceProps = {
  routeMessage?: string;
};

export function BorrowerWorkspace({ routeMessage = "" }: BorrowerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BorrowerTab>("home");

  return (
    <div className="grid gap-5">
      {routeMessage ? (
        <div
          className="rounded-2xl border border-[#cdd8d2] bg-white px-4 py-3 text-sm font-medium text-[var(--accent)]"
          role="status"
        >
          {routeMessage}
        </div>
      ) : null}

      {activeTab === "home" ? (
        <BorrowerLoanApplicationPanel view="home" onNavigate={setActiveTab} />
      ) : null}

      {activeTab === "profile" ? (
        <section className="grid gap-4">
          <SectionHeader
            title="Business profile"
            description="Keep your business details current before requesting financing."
          />
          <BorrowerPortfolioForm />
        </section>
      ) : null}

      {activeTab === "apply" ? (
        <BorrowerLoanApplicationPanel view="apply" onNavigate={setActiveTab} />
      ) : null}

      {activeTab === "offers" ? (
        <BorrowerLoanApplicationPanel view="offers" onNavigate={setActiveTab} />
      ) : null}

      <BorrowerBottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-2xl leading-tight font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}
