import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/login/actions";

export function ProfileSignOutRow() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring cursor-pointer touch-manipulation rounded-2xl bg-muted/40"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-muted-foreground/10">
          <LogOut className="size-5" />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium text-foreground">Sign out</span>
          <span className="truncate text-xs text-muted-foreground">
            Sign out of this account on this device
          </span>
        </span>
      </button>
    </form>
  );
}
