"use client";

import { useEffect } from "react";

type StatusToastProps = {
  message: string;
  onDismiss: () => void;
};

export function StatusToast({ message, onDismiss }: StatusToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(onDismiss, 3500);

    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-[#9ed7c2] bg-[#f0fff8] px-4 py-3 text-sm font-semibold text-[#0f5f45] shadow-lg shadow-black/10"
    >
      {message}
    </div>
  );
}
