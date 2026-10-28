import { AdminTables } from "@/components/AdminTables";
import { DashboardShell } from "@/components/DashboardShell";

export default function CropHealthAdminPage() {
  return (
    <DashboardShell module="crop-health">
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Crop health · contributor workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Crop health evidence tables</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Manage simulated records used for crop-health matches.</p>
        <div className="mt-8"><AdminTables key="crop-health" module="crop-health" /></div>
      </section>
    </DashboardShell>
  );
}
