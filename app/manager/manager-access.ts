import { cache } from "react";
import { requireManager, type AccessResult } from "@/lib/access-control";

/**
 * Request-scoped cached manager access check.
 *
 * React `cache()` deduplicates this call within a single server request,
 * so calling it from both the manager layout and any manager page only
 * runs `requireManager()` once per request instead of twice.
 */
export const getManagerAccess = cache((): Promise<AccessResult> => {
  return requireManager();
});
