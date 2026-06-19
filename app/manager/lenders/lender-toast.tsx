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
  const documentReview = searchParams.get("documentReview");
  const changeRequestReview = searchParams.get("changeRequestReview");
  const scrollY = searchParams.get("scrollY");

  useEffect(() => {
    if (firedRef.current) return;
    if (!review && !documentReview && !changeRequestReview && !scrollY) return;

    firedRef.current = true;

    if (scrollY) {
      const nextScrollY = Number(scrollY);
      if (Number.isFinite(nextScrollY)) {
        window.scrollTo(0, nextScrollY);
      }
    }

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
    } else if (review === "profile-details-required") {
      toast.error(
        "Waiting for lender to complete profile details: contact, area, loan range.",
      );
    } else if (review === "documents-required") {
      toast.error(
        "Accept the required documents before approving verification.",
      );
    }

    if (documentReview === "accepted") {
      toast.success("Document accepted.");
    } else if (documentReview === "rejected") {
      toast.error("Document rejected.");
    } else if (documentReview === "error") {
      toast.error("Could not update document.");
    }

    if (changeRequestReview === "approved") {
      toast.success("Profile change request approved.");
    } else if (changeRequestReview === "rejected") {
      toast.error("Profile change request rejected.");
    } else if (changeRequestReview === "error") {
      toast.error("Could not update profile change request.");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("review");
    params.delete("documentReview");
    params.delete("changeRequestReview");
    params.delete("scrollY");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    review,
    documentReview,
    changeRequestReview,
    scrollY,
    searchParams,
    router,
    pathname,
  ]);

  return null;
}
