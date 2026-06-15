export default function LenderApplicationsLoading() {
  return (
    <main className="min-h-svh bg-background">
      <div className="h-14 border-b border-border/70 bg-background/95 sm:h-16" />
      <div className="mx-auto max-w-7xl">
        <div className="px-4 pt-4 pb-32 sm:px-6 sm:pt-6">
          <div className="mx-auto grid max-w-4xl gap-5">
            <div className="h-5 w-24 rounded-full bg-muted" />
            <div className="grid gap-3">
              <div className="h-8 w-48 rounded-full bg-muted" />
              <div className="h-5 w-full max-w-md rounded-full bg-muted" />
            </div>
            <div className="grid gap-3">
              <div className="h-44 rounded-2xl border border-border/50 bg-card shadow-sm" />
              <div className="h-44 rounded-2xl border border-border/50 bg-card shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
