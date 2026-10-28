"use client";

import Link from "next/link";
import { useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import { AccountForm } from "./AccountForm";

type Props = { cropId: number; planId: number; county: string; area: string; season: string };
export function SavePlanButton({ cropId, planId, county, area, season }: Props) {
  const [needsLogin, setNeedsLogin] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/saved-plans`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop_id: cropId, plan_id: planId, county, area, season }),
      });
      if (response.status === 401) { setNeedsLogin(true); return; }
      if (!response.ok) throw new Error("Could not save this plan. Please try again.");
      const body = await response.json(); setSavedId(body.id); setNeedsLogin(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this plan."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4">
    {savedId ? <p className="text-emerald-800">Plan saved. <Link href={`/planting/plans?plan=${savedId}`} className="font-semibold underline">View your plan and add notes</Link></p> :
      <button type="button" onClick={save} disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save this plan"}</button>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    {needsLogin && <div className="mt-3"><AccountForm onSuccess={() => { setNeedsLogin(false); void save(); }} /></div>}
  </div>;
}
