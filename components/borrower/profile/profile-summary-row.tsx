export function ProfileSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <p className="text-sm font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="max-w-[60%] text-right text-sm font-semibold break-words">
        {value}
      </p>
    </div>
  );
}
