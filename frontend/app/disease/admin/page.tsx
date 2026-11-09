import { AdminWorkspace } from "@/components/AdminWorkspace";
import { DashboardShell } from "@/components/DashboardShell";

export default function CropHealthAdminPage() {
  return (
    <DashboardShell>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <AdminWorkspace />
      </section>
    </DashboardShell>
  );
}
