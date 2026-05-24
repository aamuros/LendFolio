export default function LenderApplicationsLoading() {
  return (
    <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-4xl gap-5">
        <div className="h-5 w-24 rounded-full bg-[var(--muted)]" />
        <div className="grid gap-3">
          <div className="h-8 w-48 rounded-full bg-[var(--muted)]" />
          <div className="h-5 w-full max-w-md rounded-full bg-[var(--muted)]" />
        </div>
        <div className="grid gap-3">
          <div className="h-44 rounded-3xl border border-[var(--border)] bg-white shadow-sm" />
          <div className="h-44 rounded-3xl border border-[var(--border)] bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}
