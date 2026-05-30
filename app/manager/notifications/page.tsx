import { getManagerAccess } from "../manager-access";
import { AccessDenied, ManagerShell } from "../manager-ui";
import { ManagerNotificationsContent } from "@/components/notifications/manager-notifications-content";

export default async function ManagerNotificationsPage() {
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Notifications"
        description="Workflow updates and review activity."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  return (
    <ManagerShell
      title="Notifications"
      description="Workflow updates and review activity."
    >
      <ManagerNotificationsContent />
    </ManagerShell>
  );
}
