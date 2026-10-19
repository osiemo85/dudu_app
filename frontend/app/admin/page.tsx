import { AdminTables } from "@/components/AdminTables";
import { SiteHeader } from "@/components/SiteHeader";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-[var(--foreground)]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Contributor workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Demo evidence tables</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Review or add local records used by the disease agent. This is an unauthenticated local demo admin; do not expose it publicly.</p>
        <div className="mt-8"><AdminTables /></div>
      </section>
    </main>
  );
}
