import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LenderHeader, type LenderTab } from "@/components/lender-bottom-tabs";

export async function LenderPageHeader({
  activeTab = "home",
  showNotifications = true,
}: {
  activeTab?: LenderTab;
  showNotifications?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <LenderHeader
      activeTab={activeTab}
      showNotifications={showNotifications}
      accountEmail={user?.email}
    />
  );
}
