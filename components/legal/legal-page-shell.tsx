import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LegalContent } from "@/components/legal/legal-content";

type LegalPageShellProps = {
  content: LegalContent;
  from?: string;
};

export function LegalPageShell({ content, from }: LegalPageShellProps) {
  const backHref = from === "signup" ? "/signup" : "/";
  const backLabel = from === "signup" ? "Back to signup" : "Back to LendFolio";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.18em] uppercase"
          >
            LENDFOLIO
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" })
              )}
            >
              Create account
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Button
          variant="ghost"
          size="lg"
          className="-ml-2 mb-6 w-fit text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl leading-tight sm:text-3xl">
              {content.title}
            </CardTitle>
            <CardDescription>{content.description}</CardDescription>
            <p className="text-xs text-muted-foreground">
              {content.displayVersion} &middot; {content.lastUpdated}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {content.sections.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {section.heading}
                  </h3>
                  <div className="space-y-2">
                    {section.paragraphs.map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-muted-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Link
            href="/terms?from=home"
            className="transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy?from=home"
            className="transition-colors hover:text-foreground"
          >
            Privacy Notice
          </Link>
          <Link
            href="/"
            className="font-semibold tracking-[0.14em] transition-colors hover:text-foreground uppercase"
          >
            LendFolio
          </Link>
        </nav>
      </main>
    </div>
  );
}
