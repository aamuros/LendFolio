export default function LenderApplicationsLoading() {
  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <div className="h-5 w-40 rounded-md bg-[var(--muted)]" />
        <div className="grid gap-3 pt-4">
          <div className="h-5 w-32 rounded-md bg-[var(--muted)]" />
          <div className="h-12 w-full max-w-xl rounded-md bg-[var(--muted)]" />
          <div className="h-6 w-full max-w-2xl rounded-md bg-[var(--muted)]" />
        </div>
        <div className="h-20 rounded-md border border-[var(--border)] bg-white" />
        <div className="grid gap-3">
          <div className="h-40 rounded-md border border-[var(--border)] bg-white" />
          <div className="h-40 rounded-md border border-[var(--border)] bg-white" />
        </div>
      </div>
    </main>
  );
}
