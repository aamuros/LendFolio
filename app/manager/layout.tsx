import type { ReactNode } from "react";
import { signOutAction } from "@/app/login/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ManagerLayoutShell } from "./manager-layout-shell";

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  let userEmail: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // Auth not available
  }

  return (
    <ManagerLayoutShell userEmail={userEmail} signOutAction={signOutAction}>
      {children}
    </ManagerLayoutShell>
  );
}
