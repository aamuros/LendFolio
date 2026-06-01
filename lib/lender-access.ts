import { cache } from "react";
import { requireApprovedLender, type AccessResult } from "@/lib/access-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-scoped cached lender access check.
 *
 * React `cache()` deduplicates this call within a single server request,
 * so calling it from both the page component and any server action or
 * data loader only runs `requireApprovedLender()` once per request.
 */
export const getLenderAccess = cache(async (): Promise<AccessResult> => {
  const supabase = await createSupabaseServerClient();
  return requireApprovedLender(supabase);
});
