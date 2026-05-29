import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signOutAction } from "@/app/login/actions";
import { LogOut } from "lucide-react";

export function AccountSection({ email }: { email: string }) {
  return (
    <Card className="rounded-2xl shadow-none">
      <div className="px-5 pt-5 pb-4">
        <h3 className="text-sm font-medium text-foreground">Account</h3>
        <p className="mt-0.5 break-words text-sm text-muted-foreground">
          {email || "Signed in"}
        </p>
      </div>
      <Separator />
      <div className="px-5 py-4">
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="gap-2 text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </Card>
  );
}
