"use client";

import { useEffect } from "react";
import {
  AUTH_FLOW_ACK_STORAGE_KEY,
  AUTH_FLOW_STORAGE_KEY,
  publishAuthFlowCompleted,
  type AuthFlowCompleted,
} from "@/lib/auth-flow-sync";

export function AuthFlowCompletionSignal({
  flow,
}: {
  flow: AuthFlowCompleted;
}) {
  useEffect(() => {
    function closeConfirmationTab() {
      window.close();
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === AUTH_FLOW_ACK_STORAGE_KEY &&
        event.newValue?.includes(flow)
      ) {
        closeConfirmationTab();
      }
    }

    const channel = "BroadcastChannel" in window
      ? new BroadcastChannel(AUTH_FLOW_STORAGE_KEY)
      : null;
    channel?.addEventListener("message", (event) => {
      if (event.data === `${flow}:ack`) closeConfirmationTab();
    });
    window.addEventListener("storage", handleStorage);
    publishAuthFlowCompleted(flow);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [flow]);

  return null;
}
