import { Button } from "@/components/ui/button";
import { BorrowerCard } from "@/components/borrower/ui/borrower-card";
import { signOutAction } from "@/app/login/actions";
import { LogOut } from "lucide-react";

export function AccountSection({ email }: { email: string }) {
  return (
    <div className="grid gap-6">
      <BorrowerCard>
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-sm font-medium text-foreground">Account</h3>
          <p className="mt-0.5 break-words text-sm text-muted-foreground">
            {email || "Signed in"}
          </p>
        </div>
      </BorrowerCard>

      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Sign out of this account on this device.
        </p>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            className="gap-2"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
