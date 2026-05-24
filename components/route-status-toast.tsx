"use client";

import { useCallback, useState } from "react";
import { StatusToast } from "@/components/status-toast";

type RouteStatusToastProps = {
  message?: string;
};

export function RouteStatusToast({ message }: RouteStatusToastProps) {
  const [visibleMessage, setVisibleMessage] = useState(message ?? "");
  const dismiss = useCallback(() => {
    setVisibleMessage("");
  }, []);

  return <StatusToast message={visibleMessage} onDismiss={dismiss} />;
}
