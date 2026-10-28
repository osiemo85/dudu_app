import { PlantingForm } from "@/components/PlantingForm";
import { DashboardShell } from "@/components/DashboardShell";

export default function PlantingPage() {
  return (
    <DashboardShell module="planting">
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="mb-8 max-w-3xl text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">Find crops for your season.</h1>
        <PlantingForm />
      </section>
    </DashboardShell>
  );
}
