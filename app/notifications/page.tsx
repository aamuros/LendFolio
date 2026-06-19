import { redirect, RedirectType } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/access-control";
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";

export default async function NotificationsPage() {
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    redirect(
      access.reason === "email_unverified" ? "/login?message=verify-email" : "/login",
      RedirectType.replace,
    );
  }

  return <NotificationsPageClient />;
}
