import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function ProfileSubviewHeader({
  description,
  onBack,
  title,
}: {
  description?: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Back to Profile"
        onClick={onBack}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Button>
      <div className="grid gap-0.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileSubview({
  children,
  onBack,
  title,
}: {
  children: ReactNode;
  onBack: () => void;
  title: string;
}) {
  return (
    <section className="grid gap-6">
      <ProfileSubviewHeader title={title} onBack={onBack} />
      {children}
    </section>
  );
}
