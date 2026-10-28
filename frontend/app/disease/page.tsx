import { DiseaseForm } from "@/components/DiseaseForm";
import { DashboardShell } from "@/components/DashboardShell";

export default function DiseasePage() {
  return (
    <DashboardShell module="crop-health">
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="mb-8 max-w-3xl text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">Explore what may be affecting your crop.</h1>
        <DiseaseForm />
      </section>
    </DashboardShell>
  );
}
