import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/login/actions";

export function AccountSection({ email }: { email: string }) {
  return (
    <Card className="rounded-2xl shadow-sm border-border bg-card">
      <CardHeader className="p-5 pb-0">
        <CardTitle className="text-base">Account</CardTitle>
        <CardDescription className="break-words text-sm">
          {email || "Signed in"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-4">
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
