export function ProfileSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <p className="text-sm text-muted-foreground shrink-0">{label}</p>
      <p className="text-sm font-medium text-right break-words max-w-[55%]">
        {value}
      </p>
    </div>
  );
}
