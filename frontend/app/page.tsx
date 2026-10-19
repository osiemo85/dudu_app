import { getApiStatus } from "@/lib/api";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";

async function BackendStatus() {
  const apiStatus = await getApiStatus();

  return (
    <div className="mt-4 flex items-center gap-2 sm:mt-0" aria-live="polite">
      <span className={`size-2.5 rounded-full ${apiStatus.connected ? "bg-emerald-500" : "bg-amber-500"}`} />
      <span className="text-sm font-medium text-slate-700">{apiStatus.message}</span>
    </div>
  );
}

function BackendStatusFallback() {
  return (
    <div className="mt-4 flex items-center gap-2 sm:mt-0">
      <span className="size-2.5 animate-pulse rounded-full bg-slate-300" />
      <span className="text-sm font-medium text-slate-500">Checking connection…</span>
    </div>
  );
}

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Integrated Agricultural Advisory</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-emerald-950 sm:text-6xl">
            Practical support for a healthier, more productive farm.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            A simple starting point for exploring crop health and planting decisions with local context.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <Link href="/disease" className="group rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
              <span className="text-3xl" aria-hidden="true">🔎</span>
              <h2 className="mt-4 text-2xl font-semibold text-emerald-950">Check crop health</h2>
              <p className="mt-2 leading-7 text-slate-600">Share a photo or symptoms and explore possible causes with local demo context.</p>
              <p className="mt-5 font-semibold text-emerald-700">Open disease identification →</p>
            </Link>
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6 text-slate-600">
              <span className="text-3xl grayscale" aria-hidden="true">🌾</span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-800">Plan a crop</h2>
              <p className="mt-2 leading-7">Location and season based planting advice will be implemented in the next phase.</p>
              <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Coming next</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-950">Backend connection</p>
              <p className="mt-1 text-sm text-slate-600">FastAPI health endpoint</p>
            </div>
            <Suspense fallback={<BackendStatusFallback />}><BackendStatus /></Suspense>
          </div>
          <p className="mt-5 max-w-2xl text-xs leading-5 text-slate-500">
            This is a demonstration. Any future guidance will depend on the information and evidence available, and should be checked with a qualified local advisor.
          </p>
        </div>
      </section>
      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 text-sm text-slate-500">Built for local agricultural context · Demo data only</div>
      </footer>
    </main>
  );
}
