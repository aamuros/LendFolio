import { LegalPageShell } from "@/components/legal/legal-page-shell";

type TermsPageProps = {
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const params = await searchParams;

  return (
    <LegalPageShell
      title="Terms of Service"
      version="2026-05-terms-v1"
      description="These terms describe how LendFolio accounts, borrower profiles, applications, offers, and platform management tools may be used."
      from={params?.from}
    >
      <p>
        LendFolio provides account, borrower profile, loan application, offer
        review, and platform management tools for the financing workflow.
      </p>
      <p>
        Users are responsible for keeping submitted information accurate,
        protecting account access, and using the platform only for legitimate
        financing activity.
      </p>
      <p>
        Lenders may review applications and send offers only after platform
        approval. Borrowers may accept one pending offer for an application.
      </p>
    </LegalPageShell>
  );
}
