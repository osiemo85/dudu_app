import { DiseaseForm } from "@/components/DiseaseForm";
import { SiteHeader } from "@/components/SiteHeader";

export default function DiseasePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Crop health · simulated advisory</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">Explore what may be affecting your crop.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">Share a photo or describe the symptoms. The result is a set of possible matches to discuss with a qualified local advisor.</p>
        </div>
        <DiseaseForm />
      </section>
    </main>
  );
}
