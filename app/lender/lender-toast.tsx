"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function LenderToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef(false);

  const message = searchParams.get("message");

  useEffect(() => {
    if (firedRef.current) return;
    if (!message) return;

    firedRef.current = true;

    if (message === "lender-details-saved") {
      toast.success("Lender details saved.");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("message");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [message, searchParams, router, pathname]);

  return null;
}
