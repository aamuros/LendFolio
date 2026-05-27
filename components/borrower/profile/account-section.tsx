import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/login/actions";

export function AccountSection({ email }: { email: string }) {
  return (
    <Card className="rounded-3xl shadow-sm border-border bg-card">
      <CardContent className="grid gap-3 p-5">
        <h3 className="text-base font-semibold">Account</h3>
        <p className="break-words text-sm text-muted-foreground">
          {email || "Signed in"}
        </p>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            className="rounded-full font-semibold h-11 px-5"
          >
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
