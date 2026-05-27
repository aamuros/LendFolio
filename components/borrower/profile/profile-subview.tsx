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
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-start">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to Profile"
        onClick={onBack}
        className="rounded-full bg-background shadow-sm hover:text-primary"
      >
        <ArrowLeft className="size-5" />
      </Button>
      <div className="grid gap-1 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
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
    <section className="grid gap-4">
      <ProfileSubviewHeader title={title} onBack={onBack} />
      {children}
    </section>
  );
}
