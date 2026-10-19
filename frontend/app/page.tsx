import { getApiStatus } from "@/lib/api";

export default async function Home() {
  const apiStatus = await getApiStatus();

  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-emerald-100 bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-700 text-lg text-white" aria-hidden="true">🌱</span>
            <span className="text-lg">Shamba <span className="text-emerald-700">Guide</span></span>
          </a>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">DEMO</span>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Integrated Agricultural Advisory</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-emerald-950 sm:text-6xl">
            Practical support for a healthier, more productive farm.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            A simple starting point for exploring crop health and planting decisions with local context.
          </p>
          <div className="mt-10 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-950">Backend connection</p>
              <p className="mt-1 text-sm text-slate-600">FastAPI health endpoint</p>
            </div>
            <div className="mt-4 flex items-center gap-2 sm:mt-0" aria-live="polite">
              <span className={`size-2.5 rounded-full ${apiStatus.connected ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-sm font-medium text-slate-700">{apiStatus.message}</span>
            </div>
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
