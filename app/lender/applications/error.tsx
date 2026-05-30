"use client";

import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function LenderApplicationsError() {
  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-7xl">
        <LenderHeader activeTab="applications" showNotifications={false} />
        <div className="px-4 pt-6 pb-32 sm:px-6 sm:pt-8">
          <div className="mx-auto grid max-w-4xl gap-5">
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
          </div>
        </div>
        <div className="sm:hidden">
          <LenderBottomTabs activeTab="applications" />
        </div>
      </div>
    </main>
  );
}
