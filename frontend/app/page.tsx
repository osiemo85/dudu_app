import Link from "next/link";
import { AccountPage } from "@/components/AccountPage";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-16 sm:py-24">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-16">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Agricultural advisory · simulated data</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-emerald-950 sm:text-6xl">Crop health guidance.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Share crop symptoms or a photo to explore possible causes.</p>
            <div className="mt-10 max-w-xl">
              <Link href="/disease" className="group rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
                <span className="text-3xl" aria-hidden="true">🔎</span>
                <h2 className="mt-4 text-2xl font-semibold text-emerald-950">Check crop health</h2>
                <p className="mt-2 leading-7 text-slate-600">Share a photo or symptoms to see possible causes.</p>
                <p className="mt-5 font-semibold text-emerald-700">Open disease identification →</p>
              </Link>
            </div>
            <p className="mt-5 max-w-2xl text-xs leading-5 text-slate-500">Demo only. Check advice with a qualified local advisor.</p>
          </div>

          <div className="w-full max-w-md justify-self-center lg:justify-self-end">
            <h2 className="mb-3 text-2xl font-semibold text-emerald-950">Log in or register</h2>
            <p className="mb-5 text-slate-600">Create an account or log in to save and manage your plans.</p>
            <AccountPage mode="login" />
          </div>
        </div>
      </section>
      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 text-sm text-slate-500">Built for local agricultural context · Demo data only</div>
      </footer>
    </main>
  );
}
