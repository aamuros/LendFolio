import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { privacyContent } from "@/components/legal/legal-content";

type PrivacyPageProps = {
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams;

  return <LegalPageShell content={privacyContent} from={params?.from} />;
}
