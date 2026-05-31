import { Card } from "@/components/ui/card";

export function LenderAccountSection({ email }: { email: string }) {
  return (
    <div className="grid gap-6">
      <Card className="rounded-2xl">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-sm font-medium text-foreground">Account</h3>
          <p className="mt-0.5 break-words text-sm text-muted-foreground">
            {email || "Signed in"}
          </p>
        </div>
      </Card>
    </div>
  );
}
