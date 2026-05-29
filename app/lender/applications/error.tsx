"use client";

import Link from "next/link";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LenderApplicationsError() {
  return (
    <main className="min-h-svh px-5 pt-4 pb-32 sm:px-8 sm:pt-6 sm:pb-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-fit text-sm font-semibold"
        >
          <Link href="/lender">LendFolio</Link>
        </Button>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="grid gap-2 p-5">
            <h1 className="text-2xl font-semibold">
              Applications could not load
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Please try again in a moment.
            </p>
          </CardContent>
        </Card>
        <LenderBottomTabs activeTab="applications" />
      </div>
    </main>
  );
}
