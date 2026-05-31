"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function VerificationToast() {
  const searchParams = useSearchParams();
  const review = searchParams.get("review");
  const documentReview = searchParams.get("documentReview");

  useEffect(() => {
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
  }, [review, documentReview]);

  return null;
}
