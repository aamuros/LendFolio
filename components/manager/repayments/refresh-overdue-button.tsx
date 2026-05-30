"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

export function RefreshOverdueButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
    >
      <RefreshCwIcon className={pending ? "animate-spin" : undefined} />
      {pending ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
