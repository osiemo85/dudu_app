import { DashboardShell } from "@/components/DashboardShell";
import { SavedPlans } from "@/components/SavedPlans";
export default function SavedPlansPage() {
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow">YOUR GROWING JOURNEY</p>
          <h1>Plans worth coming back to.</h1>
          <p>
            Private saved snapshots and observations for your growing season.
          </p>
        </div>
      </div>
      <SavedPlans />
    </DashboardShell>
  );
}
