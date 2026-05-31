import { BorrowerCard } from "@/components/borrower/ui/borrower-card";

export function AccountSection({ email }: { email: string }) {
  return (
    <div className="grid gap-6">
      <BorrowerCard>
        <div className="px-5 pt-5 pb-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Account & Security
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
            {email || "Signed in"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Signed in with your registered email address.
          </p>
        </div>
      </BorrowerCard>
    </div>
  );
}
