"use client";

import { useState } from "react";
import {
  LenderProfileHub,
  type LenderProfileView,
} from "./lender-profile-hub";

export function LenderAccountTab({
  email,
  lenderProfile,
  onNavigateHome,
}: {
  email: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lenderProfile: any;
  onNavigateHome?: () => void;
}) {
  const [activeView, setActiveView] = useState<LenderProfileView>("index");

  return (
    <LenderProfileHub
      accountEmail={email}
      activeView={activeView}
      lenderProfile={lenderProfile}
      onNavigateHome={onNavigateHome ?? (() => {})}
      onViewChange={setActiveView}
    />
  );
}
