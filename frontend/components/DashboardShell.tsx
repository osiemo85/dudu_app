"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";

type Account = { id: number; name: string; email: string; role: "user" | "admin" };

const adminDatabases = [
  ["disease_cases", "Disease cases"],
  ["sources", "Sources"],
  ["locations", "Locations"],
  ["seasons", "Seasons"],
  ["diseases", "Diseases"],
  ["disease_symptoms", "Disease symptoms"],
  ["treatments", "Treatments"],
  ["agrovets", "Agrovets"],
  ["outbreaks", "Outbreaks"],
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const isAdmin = pathname === "/disease/admin" || pathname.startsWith("/disease/admin/");
  const isCases = pathname === "/disease/cases" || pathname.startsWith("/disease/cases/");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/me`, { credentials: "include", cache: "no-store" });
        if (active) setAccount(response.ok ? await response.json() as Account : null);
      } catch { if (active) setAccount(null); }
    };
    void refresh();
    window.addEventListener("account-changed", refresh);
    return () => { active = false; window.removeEventListener("account-changed", refresh); };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-[var(--foreground)] md:flex">
      <aside className="bg-emerald-800 text-emerald-50 md:sticky md:top-0 md:flex md:h-screen md:w-72 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:block md:px-6 md:pt-7">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15 text-lg" aria-hidden="true">🌱</span>
            <span className="text-lg">Shamba Guide</span>
          </Link>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide md:mt-6 md:inline-block">SIMULATED DATA</span>
        </div>

        <nav aria-label="Crop health dashboard" className="flex gap-2 overflow-x-auto border-t border-white/15 px-3 py-3 md:block md:space-y-2 md:border-0 md:px-4 md:py-8">
          <p className="hidden px-3 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200 md:block">Crop health</p>
          <SidebarLink href="/disease" active={!isAdmin && !isCases} icon="🔎">Dashboard</SidebarLink>
          <SidebarLink href="/disease/cases" active={isCases} icon="📋">My cases</SidebarLink>
          {account?.role === "admin" && <SidebarLink href="/disease/admin/disease_cases" active={isAdmin} icon="▦">Information databases</SidebarLink>}
        </nav>

        <div className="hidden border-t border-white/15 px-4 py-5 md:mt-auto md:block">
          {account && <ProfileMenu account={account} onLogout={() => setAccount(null)} />}
          <Link href="/" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-white/10">
            <span aria-hidden="true">⌂</span>Crop health home
          </Link>
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        {isAdmin && account?.role === "admin" && <AdminDatabaseNav />}
        {children}
      </section>
    </main>
  );
}

function AdminDatabaseNav() {
  const pathname = usePathname();
  const selectedTable = pathname.split("/").at(-1) ?? "disease_cases";

  return (
    <nav aria-label="Information databases" className="border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        {adminDatabases.map(([table, label]) => {
          const active = table === selectedTable;
          return <Link
            key={table}
            href={`/disease/admin/${table}`}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center rounded-lg border px-3 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${active
              ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
              : "border-transparent text-emerald-800 underline decoration-emerald-300 decoration-1 underline-offset-4 hover:border-emerald-200 hover:bg-emerald-50 hover:decoration-2"}`}
          >
            {label}
          </Link>;
        })}
      </div>
    </nav>
  );
}

function ProfileMenu({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const initials = (account.name || account.email).trim().slice(0, 1).toUpperCase();

  async function logout() {
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error();
      onLogout();
      window.dispatchEvent(new Event("account-changed"));
      router.replace("/");
      router.refresh();
    } catch { setError("Could not log out. Please try again."); }
  }

  return (
    <div className="relative">
      {open && <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-60 rounded-2xl bg-white p-3 text-slate-800 shadow-xl ring-1 ring-black/10">
        <p className="truncate font-semibold">{account.name || account.email}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{account.email}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">{account.role}</p>
        <button type="button" role="menuitem" onClick={logout} className="mt-3 w-full rounded-xl bg-emerald-700 px-3 py-2 text-left text-sm font-semibold text-white">Log out</button>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>}
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="menu" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-emerald-50 transition hover:bg-white/10">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-emerald-800" aria-hidden="true">{initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate">{account.name || account.email}</span><span className="block text-xs font-normal text-emerald-200">{account.role === "admin" ? "Admin" : "Account"}</span></span>
        <span aria-hidden="true">⌃</span>
      </button>
    </div>
  );
}

function SidebarLink({ href, active, icon, children }: { href: string; active: boolean; icon: string; children: ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
      <span className="w-5 text-center" aria-hidden="true">{icon}</span>{children}
    </Link>
  );
}
