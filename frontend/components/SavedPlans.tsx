"use client";

import { T } from "@/components/LanguageProvider";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/advisory";
import { PlanStages, type ManagementPlan } from "./CropPlanPreview";
type Saved = {
  id: number;
  created_at: string;
  snapshot: {
    crop: string;
    location: { label: string };
    season: { label: string };
    plan: ManagementPlan;
    disclaimer: string;
  };
};
type Detail = Saved & {
  notes: { id: number; body: string; created_at: string; category: string }[];
};
export function SavedPlans() {
  const [plans, setPlans] = useState<Saved[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<Saved[]>("/saved-plans")
      .then((data) => {
        if (active) {
          setPlans(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function open(id: number) {
    setBusy(true);
    setError("");
    try {
      setSelected(await api<Detail>(`/saved-plans/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api(`/saved-plans/${selected.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "other",
          body: String(data.get("body")).trim(),
        }),
      });
      setSelected(await api<Detail>(`/saved-plans/${selected.id}`));
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      {error && (
        <div className="error-message" role="alert">
          {error}{" "}
          <Link className="underline" href="/account/login"><T>Log in</T></Link>{" "}
          to access your private saved plans.{" "}
          <button className="button" onClick={() => setRetry((x) => x + 1)}><T>Retry</T></button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading saved plans…</p>
      ) : (
        <div className="workspace-grid">
          <section className="panel stack">
            <h2>Your plan snapshots ({plans.length})</h2>
            {!plans.length && (
              <p className="page-description">
                No saved plans to show. Explore a crop in Planting and save a
                growing plan while signed in.
              </p>
            )}
            {plans.map((plan) => (
              <button
                className="button button-secondary justify-start text-left"
                key={plan.id}
                onClick={() => void open(plan.id)}
                disabled={busy}
                aria-pressed={selected?.id === plan.id}
              >
                <span>
                  {plan.snapshot.crop}
                  <small className="block font-normal">
                    {plan.snapshot.location.label} ·{" "}
                    {plan.snapshot.season.label}
                  </small>
                </span>
              </button>
            ))}
            <Link className="button button-primary" href="/planting"><T>Explore planting options</T></Link>
          </section>
          <section className="panel" aria-live="polite">
            {selected ? (
              <>
                <span className="demo-tag">SAVED SIMULATED PLAN</span>
                <h2 className="mt-4">{selected.snapshot.crop}</h2>
                <p className="text-sm mb-4">
                  {selected.snapshot.location.label} ·{" "}
                  {selected.snapshot.season.label}
                </p>
                <PlanStages plan={selected.snapshot.plan} />
                <p className="provenance">
                  Saved {new Date(selected.created_at).toLocaleDateString()} ·{" "}
                  {selected.snapshot.disclaimer}
                </p>
                <h3 className="font-semibold mt-6"><T>Your observations</T></h3>
                {selected.notes.map((note) => (
                  <div key={note.id} className="note-item">
                    <div>
                      <p>{note.body}</p>
                      <time>
                        {new Date(note.created_at).toLocaleString()}<T>· Farmer observation</T></time>
                    </div>
                  </div>
                ))}
                <form onSubmit={addNote} className="stack mt-4">
                  <label className="field-label"><T>Add an observation</T><textarea
                      name="body"
                      className="field"
                      maxLength={4000}
                      rows={3}
                      required
                    />
                  </label>
                  <button className="button button-primary" disabled={busy}>
                    {busy ? "Saving…" : "Save observation"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2>Your plans, ready when you need them.</h2>
                <p className="page-description">
                  Choose a saved snapshot to review its stages and add
                  observations. Saved plans contain simulated advice as it
                  appeared when saved.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
