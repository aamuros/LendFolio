import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    <section className="grid gap-4 bg-background">
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to Home"
          onClick={onBack}
          className="rounded-full bg-background shadow-sm hover:text-primary"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-center text-lg font-semibold">Profile</h2>
      </div>

      <div className="grid justify-items-center gap-2 text-center">
        <Avatar className="size-20 shadow-sm text-xl font-semibold">
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="grid max-w-full gap-1">
          <h3 className="max-w-full truncate text-lg font-semibold">
            {displayName}
          </h3>
          <p className="max-w-full truncate text-sm text-muted-foreground">
            {email || "Signed in"}
          </p>
        </div>
        <Button
          variant="default"
          onClick={onEditProfile}
          className="mt-0.5 min-w-40 rounded-full font-semibold"
        >
          Edit Profile
        </Button>
      </div>
    </section>
  );
}
