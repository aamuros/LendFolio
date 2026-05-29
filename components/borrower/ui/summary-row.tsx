export function SummaryRow({
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

export function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
