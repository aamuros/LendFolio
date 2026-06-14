"use client";

import { useState } from "react";
import {
  LenderProfileHub,
  type LenderProfileView,
} from "./lender-profile-hub";
import type { ConsentStatus } from "@/lib/consents";

export function LenderAccountTab({
  email,
  consentStatus,
  lenderProfile,
  onNavigateHome,
}: {
  email: string;
  consentStatus?: ConsentStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lenderProfile: any;
  onNavigateHome?: () => void;
}) {
  const [activeView, setActiveView] = useState<LenderProfileView>("index");

  return (
    <LenderProfileHub
      accountEmail={email}
      activeView={activeView}
      consentStatus={consentStatus}
      lenderProfile={lenderProfile}
      onNavigateHome={onNavigateHome ?? (() => {})}
      onViewChange={setActiveView}
    />
  );
}
