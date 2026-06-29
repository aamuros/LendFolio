"use client";

import { useEffect } from "react";
import {
  publishAuthFlowCompleted,
  type AuthFlowCompleted,
} from "@/lib/auth-flow-sync";

export function AuthFlowCompletionSignal({
  flow,
}: {
  flow: AuthFlowCompleted;
}) {
  useEffect(() => {
    publishAuthFlowCompleted(flow);
  }, [flow]);

  return null;
}
