"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { SavedPlan, SavedPlanDetail } from "@/lib/types";
import { AccountForm } from "./AccountForm";
import { PlanContent } from "./PlanContent";
import { DisclaimerBanner } from "./DisclaimerBanner";

const categories: Record<string, string> = {
  land_preparation: "Land preparation note", planting: "Planting note", crop_management: "Crop management note",
  disease: "Disease note", weather: "Weather note", harvest: "Harvest note", other: "Other note",
};

export function SavedPlans() {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [selected, setSelected] = useState<SavedPlanDetail | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function openPlan(id: number) {
    setError("");
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/saved-plans/${id}`, { credentials: "include" });
      if (response.status === 401) { setAuthRequired(true); setSelected(null); return; }
      if (!response.ok) throw new Error("Could not load this plan.");
      setSelected(await response.json());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load this plan."); }
  }

  async function loadPlans() {
    setError("");
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/saved-plans`, { credentials: "include" });
      if (response.status === 401) { setAuthRequired(true); setPlans(null); return; }
      if (!response.ok) throw new Error("Could not load saved plans.");
      const rows: SavedPlan[] = await response.json();
      setAuthRequired(false); setPlans(rows);
      const requested = Number(new URLSearchParams(window.location.search).get("plan"));
      if (requested && rows.some((row) => row.id === requested)) await openPlan(requested);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load saved plans."); }
  }
  useEffect(() => {
    let active = true;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/saved-plans`, { credentials: "include" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) { setAuthRequired(true); return; }
        if (!response.ok) throw new Error("Could not load saved plans.");
        const rows: SavedPlan[] = await response.json();
        if (!active) return;
        setPlans(rows);
        const requested = Number(new URLSearchParams(window.location.search).get("plan"));
        if (requested && rows.some((row) => row.id === requested)) {
          const detail = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/saved-plans/${requested}`, { credentials: "include" });
          if (!detail.ok) throw new Error("Could not load this plan.");
          const body: SavedPlanDetail = await detail.json();
          if (active) setSelected(body);
        }
      })
      .catch(() => { if (active) setError("Could not load saved plans. Check that FastAPI is running."); });
    return () => { active = false; };
  }, []);

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError("");
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/saved-plans/${selected.id}/notes`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: form.get("category"), body: form.get("body"), observed_on: form.get("observed_on") || null }),
      });
      if (response.status === 401) { setAuthRequired(true); setSelected(null); return; }
      if (!response.ok) throw new Error("Could not add your note. Check the fields and try again.");
      formElement.reset(); await openPlan(selected.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add your note."); }
    finally { setBusy(false); }
  }

  async function logout() {
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Could not log out. Please try again.");
      setPlans(null); setSelected(null); setAuthRequired(true);
      window.dispatchEvent(new Event("account-changed"));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not log out."); }
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {authRequired ? <AccountForm onSuccess={() => void loadPlans()} /> : plans === null ? <p>Loading your plans…</p> : <>
      <div className="flex items-center justify-between"><p className="text-sm text-slate-600">Your plans and notes are stored on this demo server.</p><button onClick={logout} className="text-sm font-semibold text-emerald-700 underline">Log out</button></div>
      {plans.length === 0 ? <div className="rounded-2xl bg-white p-6"><p>No saved plans yet.</p><Link className="mt-3 inline-block font-semibold text-emerald-700 underline" href="/planting">Find crops and save a plan</Link></div> : <div className="grid gap-3 sm:grid-cols-2">{plans.map((item) => <button type="button" key={item.id} onClick={() => void openPlan(item.id)} className={`rounded-2xl border p-4 text-left ${selected?.id === item.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"}`}><strong>{item.snapshot.crop} · {item.snapshot.plan.variety}</strong><span className="mt-1 block text-sm text-slate-600">{item.snapshot.location.label} · {item.snapshot.season.label} {item.snapshot.season.period && `(${item.snapshot.season.period})`}</span><span className="mt-1 block text-xs text-slate-500">Saved {new Date(item.created_at).toLocaleDateString()}</span></button>)}</div>}
      {selected && <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
        <div><h2 className="text-2xl font-semibold text-emerald-950">{selected.snapshot.crop} · {selected.snapshot.plan.variety}</h2><p className="mt-2 text-sm text-slate-600">{selected.snapshot.location.label} · {selected.snapshot.season.label} {selected.snapshot.season.period && `(${selected.snapshot.season.period})`}</p><p className="mt-2 text-sm text-slate-600">{selected.snapshot.plan.maturity_days ? `Sample maturity: ${selected.snapshot.plan.maturity_days} days` : "Maturity unknown"}</p><p className="mt-2 text-sm text-amber-800">Saved simulated plan; seek local advice before acting.</p></div>
        <PlanContent plan={selected.snapshot.plan} />
        <DisclaimerBanner text={selected.snapshot.disclaimer} />
        <div className="border-t border-slate-100 pt-5"><h3 className="text-xl font-semibold">Season notes</h3><p className="mt-1 text-sm text-slate-600">Record what you observe as the season progresses. Notes are your observations, not verified advice.</p>
          <form onSubmit={addNote} className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">Note type<select name="category" className="field mt-1" required>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="block text-sm font-semibold">Observation date <span className="font-normal text-slate-500">(optional)</span><input type="date" name="observed_on" className="field mt-1" /></label>
            <label className="block text-sm font-semibold">Your note<textarea name="body" required maxLength={4000} rows={3} className="field mt-1" placeholder="What did you observe or do?" /></label>
            <button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Add note"}</button>
          </form>
          <div className="mt-5 space-y-3">{selected.notes.length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : selected.notes.map((note) => <article key={note.id} className="rounded-xl bg-slate-50 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{categories[note.category] ?? note.category}</strong><span className="text-slate-500">{note.observed_on ? `Observed ${note.observed_on}` : "Observation date not supplied"} · Added {new Date(note.created_at).toLocaleDateString()}</span></div><p className="mt-2 whitespace-pre-wrap">{note.body}</p></article>)}</div>
        </div>
      </section>}
    </>}
  </div>;
}
