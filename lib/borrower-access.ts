import { cache } from "react";
import { requireBorrower, type AccessResult } from "@/lib/access-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-scoped cached borrower access check.
 *
 * React `cache()` deduplicates this call within a single server request,
 * so calling it from both the page component and any server action or
 * data loader only runs `requireBorrower()` once per request.
 */
export const getBorrowerAccess = cache(async (): Promise<AccessResult> => {
  const supabase = await createSupabaseServerClient();
  return requireBorrower(supabase);
});
