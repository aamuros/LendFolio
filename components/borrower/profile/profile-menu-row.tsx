import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function ProfileMenuRow({
  icon: Icon,
  label,
  onClick,
  submit = false,
  subtitle,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  submit?: boolean;
  subtitle?: string;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      className="grid min-h-[3.5rem] w-full grid-cols-[2rem_1fr_1.25rem] items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border last:border-b-0 hover:bg-muted/50 active:bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary cursor-pointer touch-manipulation"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted/50 text-foreground">
        <Icon className="size-4" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-semibold leading-5 text-foreground">
          {label}
        </span>
        {subtitle ? (
          <span className="truncate text-xs leading-4 text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      {submit ? null : (
        <ChevronRight className="size-4 justify-self-end text-muted-foreground/60" />
      )}
    </button>
  );
}
