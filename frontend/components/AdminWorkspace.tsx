"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import { AdminTables, cropHealthTables, type CropHealthTable } from "./AdminTables";

export function AdminWorkspace({ table = "disease_cases" }: { table?: string }) {
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then(async (response) => response.ok && (await response.json() as { role: string }).role === "admin")
      .then((allowed) => setAccess(allowed ? "allowed" : "denied"))
      .catch(() => setAccess("denied"));
  }, []);

  if (access === "checking") return <p className="text-slate-600">Checking administrator access…</p>;
  if (access === "denied") return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-semibold text-amber-950">Administrator access required</h1><p className="mt-2 text-amber-900">Information databases are visible only to administrator accounts.</p><Link href="/account/login" className="mt-4 inline-block font-semibold text-emerald-700 underline">Log in</Link></section>;
  if (!cropHealthTables.includes(table as CropHealthTable)) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-semibold text-amber-950">Database not found</h1><p className="mt-2 text-amber-900">Choose one of the information databases from the navigation.</p><Link href="/disease/admin/disease_cases" className="mt-4 inline-block font-semibold text-emerald-700 underline">Open disease cases</Link></section>;
  return <AdminTables key={table} table={table as CropHealthTable} />;
}
