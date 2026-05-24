import { BorrowerWorkspace } from "@/components/borrower-workspace";
import { requireBorrower } from "@/lib/access-control";
import { redirect } from "next/navigation";

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

  return (
    <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-4xl gap-5">
        {access.ok ? (
          <BorrowerWorkspace accountEmail={user?.email ?? ""} />
        ) : (
          <section
            className="rounded-md border border-[var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]"
            role="alert"
          >
            {access.message}
          </section>
        )}
      </div>
    </main>
  );
}
