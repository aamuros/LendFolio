"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function LenderToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef(false);

  const review = searchParams.get("review");

  useEffect(() => {
    if (firedRef.current) return;
    if (!review) return;

    firedRef.current = true;

    if (review === "approved") {
      toast.success("Lender approved.");
    } else if (review === "rejected") {
      toast.error("Lender rejected.");
    } else if (review === "pending") {
      toast.info("Lender returned to pending.");
    } else if (review === "error") {
      toast.error("Could not update lender review.");
    } else if (review === "consent-required") {
      toast.error(
        "Lender must accept the required disclosures before approval.",
      );
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("review");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [review, searchParams, router, pathname]);

  return null;
}
