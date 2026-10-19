import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-700 text-lg text-white" aria-hidden="true">🌱</span>
          <span className="text-lg">Shamba <span className="text-emerald-700">Guide</span></span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/disease" className="rounded-full px-3 py-2 text-emerald-900 hover:bg-emerald-50">Crop health</Link>
          <Link href="/admin" className="rounded-full px-3 py-2 text-slate-600 hover:bg-slate-100">Admin</Link>
          <span className="hidden rounded-full bg-amber-100 px-3 py-1.5 text-xs text-amber-900 sm:inline">SIMULATED DATA</span>
        </nav>
      </div>
    </header>
  );
}
