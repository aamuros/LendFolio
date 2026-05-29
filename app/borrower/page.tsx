import { BorrowerWorkspace } from "@/components/borrower-workspace";
import { loadBorrowerLoanApplications } from "@/app/borrower/actions";
import { requireBorrower } from "@/lib/access-control";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BorrowerPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  if (message === "signed-in") {
    redirect("/borrower");
  }

  const access = await requireBorrower();
  const {
    data: { user },
  } = access.ok ? await access.supabase.auth.getUser() : { data: { user: null } };
  const initialLoanApplications = access.ok
    ? await loadBorrowerLoanApplications()
    : null;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
        {access.ok ? (
          <BorrowerWorkspace
            accountEmail={user?.email ?? ""}
            initialLoanApplications={initialLoanApplications}
          />
        ) : (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{access.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
