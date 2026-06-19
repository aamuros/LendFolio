"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function VerificationToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef(false);

  const review = searchParams.get("review");
  const documentReview = searchParams.get("documentReview");
  const scrollY = searchParams.get("scrollY");

  useEffect(() => {
    if (firedRef.current) return;
    if (!review && !documentReview && !scrollY) return;

    firedRef.current = true;

    if (scrollY) {
      const nextScrollY = Number(scrollY);
      if (Number.isFinite(nextScrollY)) {
        window.scrollTo(0, nextScrollY);
      }
    }

    if (review === "approved") {
      toast.success("Borrower verification approved.");
    } else if (review === "rejected") {
      toast.error("Borrower verification rejected.");
    } else if (review === "pending") {
      toast.info("Borrower verification returned to pending.");
    } else if (review === "needs-resubmission") {
      toast.warning("Borrower verification marked for resubmission.");
    } else if (review === "documents-required") {
      toast.error(
        "Accept the required documents before approving verification.",
      );
    } else if (review === "error") {
      toast.error("Could not update borrower verification.");
    }

    if (documentReview === "accepted") {
      toast.success("Verification document accepted.");
    } else if (documentReview === "rejected") {
      toast.error("Verification document rejected.");
    } else if (documentReview === "error") {
      toast.error("Could not update verification document.");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("review");
    params.delete("documentReview");
    params.delete("scrollY");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [review, documentReview, scrollY, searchParams, router, pathname]);

  return null;
}
