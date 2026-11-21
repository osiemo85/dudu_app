import { DashboardShell } from "@/components/DashboardShell";
import { ProfilePage } from "@/components/ProfilePage";

export const metadata = { title: "Profile" };

export default function Page() {
  return (
    <DashboardShell>
      <ProfilePage />
    </DashboardShell>
  );
}
