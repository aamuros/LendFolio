import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil } from "lucide-react";

export function ProfileIndexHeader({
  displayName,
  email,
  isLoading = false,
  onBack,
  onEditProfile,
}: {
  displayName: string;
  email: string;
  isLoading?: boolean;
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
        {isLoading ? (
          <Skeleton className="h-8 w-14 rounded-md" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditProfile}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
            <span className="text-sm">Edit</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isLoading ? (
          <>
            <Skeleton className="size-14 rounded-full" />
            <div className="grid min-w-0 gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}
