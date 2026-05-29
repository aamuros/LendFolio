import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";
import { FieldDescription } from "@/components/ui/field";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 self-center font-semibold tracking-[0.18em] text-foreground uppercase"
        >
          LendFolio
        </Link>
        <SignupForm />
        <FieldDescription className="px-6 text-center">
          <Link href="/">Back to home</Link>
        </FieldDescription>
      </div>
    </div>
  );
}
