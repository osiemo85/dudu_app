import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-[var(--foreground)]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Contributor workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Choose an evidence workspace</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Edit local simulated records. Keep this demo-only workspace private.</p>
        <div className="mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
          <Link href="/disease/admin" className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"><span className="text-3xl" aria-hidden="true">🔎</span><h2 className="mt-4 text-xl font-semibold text-emerald-950">Crop health tables</h2><p className="mt-2 text-sm leading-6 text-slate-600">Manage disease, symptom, treatment, and outbreak records.</p></Link>
          <Link href="/planting/admin" className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"><span className="text-3xl" aria-hidden="true">🌾</span><h2 className="mt-4 text-xl font-semibold text-emerald-950">Planting tables</h2><p className="mt-2 text-sm leading-6 text-slate-600">Manage crop, calendar, weather, and guidance records.</p></Link>
        </div>
      </section>
    </main>
  );
}
