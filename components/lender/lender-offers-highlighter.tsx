"use client";

import { useEffect, useRef } from "react";

export function LenderOffersHighlighter({
  highlightOfferId,
}: {
  highlightOfferId: string;
}) {
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (hasScrolled.current) return;
    hasScrolled.current = true;

    const targetId = `offer-${highlightOfferId}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [highlightOfferId]);

  return null;
}
