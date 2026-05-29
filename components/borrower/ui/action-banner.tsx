import { cn } from "@/lib/utils";

type ActionBannerTone = "error" | "info" | "success";

const toneClassName: Record<ActionBannerTone, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-border bg-muted/30 text-foreground",
  success: "border-border bg-muted text-foreground",
};

export function ActionBanner({
  message,
  title,
  tone,
}: {
  message?: string;
  title: string;
  tone: ActionBannerTone;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 text-sm leading-6",
        toneClassName[tone],
      )}
    >
      <p className="font-semibold">{title}</p>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function InlineStatus({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "error";
}) {
  return (
    <p
      className={cn(
        "rounded-xl border px-3 py-2 text-sm leading-6",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-foreground",
      )}
      role="status"
    >
      {message}
    </p>
  );
}
