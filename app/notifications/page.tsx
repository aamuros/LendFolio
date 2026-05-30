import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/access-control";
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";

export default async function NotificationsPage() {
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    redirect("/login");
  }

  return <NotificationsPageClient />;
}
