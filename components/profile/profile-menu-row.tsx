import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function ProfileMenuRow({
  icon: Icon,
  label,
  onClick,
  subtitle,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring cursor-pointer touch-manipulation"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-muted-foreground/10">
        <Icon className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {subtitle ? (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/60" />
    </button>
  );
}
