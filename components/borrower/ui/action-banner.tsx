import { cn } from "@/lib/utils";

type ActionBannerTone = "error" | "info" | "success";

const toneClassName: Record<ActionBannerTone, string> = {
  error: "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]",
  info: "border-border/90 bg-card/80 text-foreground",
  success: "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
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
          ? "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]"
          : "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]",
      )}
      role="status"
    >
      {message}
    </p>
  );
}
