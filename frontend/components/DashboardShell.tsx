"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Module = "crop-health" | "planting";

type DashboardShellProps = {
  module: Module;
  children: ReactNode;
};

const moduleDetails = {
  "crop-health": {
    label: "Crop health",
    icon: "🔎",
    dashboardHref: "/disease",
    adminHref: "/disease/admin",
    adminLabel: "Information databases",
    otherLabel: "Planting",
    otherHref: "/planting",
  },
  planting: {
    label: "Planting",
    icon: "🌾",
    dashboardHref: "/planting",
    adminHref: "/planting/admin",
    adminLabel: "Admin tables",
    otherLabel: "Crop health",
    otherHref: "/disease",
  },
} as const;

export function DashboardShell({ module, children }: DashboardShellProps) {
  const pathname = usePathname();
  const details = moduleDetails[module];
  const isAdmin = pathname === details.adminHref;

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

        <nav aria-label={`${details.label} dashboard`} className="flex gap-2 overflow-x-auto border-t border-white/15 px-3 py-3 md:block md:space-y-2 md:border-0 md:px-4 md:py-8">
          <p className="hidden px-3 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200 md:block">{details.label}</p>
          <SidebarLink href={details.dashboardHref} active={!isAdmin} icon={details.icon}>Dashboard</SidebarLink>
          <SidebarLink href={details.adminHref} active={isAdmin} icon="▦">{details.adminLabel}</SidebarLink>
        </nav>

        <div className="hidden border-t border-white/15 px-4 py-5 md:mt-auto md:block">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Other workspace</p>
          <Link href={details.otherHref} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-white/10">
            <span aria-hidden="true">{module === "crop-health" ? "🌾" : "🔎"}</span>{details.otherLabel}
          </Link>
          <Link href="/" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-white/10">
            <span aria-hidden="true">⌂</span>All workspaces
          </Link>
        </div>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </main>
  );
}

function SidebarLink({ href, active, icon, children }: { href: string; active: boolean; icon: string; children: ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
      <span className="w-5 text-center" aria-hidden="true">{icon}</span>{children}
    </Link>
  );
}
