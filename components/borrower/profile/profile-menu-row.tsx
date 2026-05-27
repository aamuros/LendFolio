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
      className="grid min-h-14 w-full grid-cols-[2.25rem_1fr_1.25rem] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
    >
      <span className="grid size-9 place-items-center rounded-full bg-background text-foreground">
        <Icon className="size-5" />
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
        <ChevronRight className="size-5 justify-self-end text-muted-foreground" />
      )}
    </button>
  );
}
