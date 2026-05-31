import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { termsContent } from "@/components/legal/legal-content";

type TermsPageProps = {
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const params = await searchParams;

  return <LegalPageShell content={termsContent} from={params?.from} />;
}
