import { DashboardShell } from "@/components/DashboardShell";
import { AnimalHealth } from "@/components/AnimalHealth";
import Link from "next/link";
export default function Page() {
  return (
    <DashboardShell>
      <div className="flex justify-end mb-5">
        <Link className="button button-secondary case-history-link" href="/animal-health/cases">Animal case history</Link>
      </div>
      <AnimalHealth />
    </DashboardShell>
  );
}
