"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import { AdminTables } from "./AdminTables";

export function AdminWorkspace() {
  const searchParams = useSearchParams();
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then(async (response) => response.ok && (await response.json() as { role: string }).role === "admin")
      .then((allowed) => setAccess(allowed ? "allowed" : "denied"))
      .catch(() => setAccess("denied"));
  }, []);

  if (access === "checking") return <p className="text-slate-600">Checking administrator access…</p>;
  if (access === "denied") return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-semibold text-amber-950">Administrator access required</h1><p className="mt-2 text-amber-900">Information databases are visible only to administrator accounts.</p><Link href="/account/login" className="mt-4 inline-block font-semibold text-emerald-700 underline">Log in</Link></section>;
  return <AdminTables key={searchParams.get("table") ?? "disease_cases"} module="crop-health" />;
}
