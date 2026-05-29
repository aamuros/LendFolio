export function ProfileSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 py-3 last:border-b-0">
      <p className="shrink-0 text-sm text-muted-foreground">{label}</p>
      <p className="max-w-[55%] break-words text-right text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
