import { DashboardShell } from "@/components/DashboardShell";
import { SavedPlans } from "@/components/SavedPlans";

export default function SavedPlansPage() {
  return <DashboardShell module="planting"><section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
    <h1 className="mb-6 text-4xl font-semibold tracking-tight text-emerald-950">My planting plans</h1>
    <SavedPlans />
  </section></DashboardShell>;
}
