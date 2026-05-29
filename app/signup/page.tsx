import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit rounded-full text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Button>
        <SignupForm />
      </div>
    </div>
  );
}
