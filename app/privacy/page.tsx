import { LegalPageShell } from "@/components/legal/legal-page-shell";

type PrivacyPageProps = {
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams;

  return (
    <LegalPageShell
      title="Privacy Notice"
      version="2026-05-privacy-v1"
      description="This notice explains how LendFolio handles account, profile, verification, application, offer, and repayment information."
      from={params?.from}
    >
      <p>
        LendFolio uses account, profile, application, offer, verification, and
        workflow information to operate the financing process.
      </p>
      <p>
        The platform limits workspace access by role and lender approval status.
        Required consent records are stored with the accepted version and basic
        request metadata.
      </p>
      <p>
        Users should submit only information needed for account access,
        borrower review, lender review, and application decisions.
      </p>
    </LegalPageShell>
  );
}
