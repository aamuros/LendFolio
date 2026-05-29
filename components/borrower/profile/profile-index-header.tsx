import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

export function ProfileIndexHeader({
  displayName,
  email,
  onBack,
  onEditProfile,
}: {
  displayName: string;
  email: string;
  onBack: () => void;
  onEditProfile: () => void;
}) {
  function getInitials(value: string) {
    const initials = value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

    return initials || "B";
  }

  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Back to Home"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm">Home</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditProfile}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3.5" />
          <span className="text-sm">Edit</span>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="size-14 text-base font-semibold">
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 gap-0.5">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {displayName}
          </h2>
          {email ? (
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
