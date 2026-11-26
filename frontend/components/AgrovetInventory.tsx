"use client";

import { useCallback, useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";

type Drug = { id: number; disease_id: number; disease_name: string; drug_name: string; availability_status: "reported_available" | "reported_unavailable"; reported_at: string };
type Shop = { id: number; name: string; county: string; area: string; initial_disease_name: string; initial_treatment_name: string; drugs: Drug[] };
type Disease = { id: number; crop: string; name: string };

export function AgrovetInventory() {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [form, setForm] = useState<Record<number, { disease_id: string; drug_name: string }>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [shopsResponse, diseasesResponse] = await Promise.all([
      fetch(`${PUBLIC_API_BASE_URL}/api/v1/agrovets/mine`, { credentials: "include", cache: "no-store" }),
      fetch(`${PUBLIC_API_BASE_URL}/api/v1/agrovets/diseases`, { credentials: "include", cache: "no-store" }),
    ]);
    if (!shopsResponse.ok || !diseasesResponse.ok) throw new Error(shopsResponse.status === 401 ? "Log in to manage an assigned agrovet." : "Could not load agrovet listings.");
    setShops(await shopsResponse.json() as Shop[]);
    setDiseases(await diseasesResponse.json() as Disease[]);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load listings.")); });
  }, [load]);

  async function addDrug(event: React.FormEvent<HTMLFormElement>, shopId: number) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const selected = form[shopId];
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/agrovets/${shopId}/drugs`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease_id: Number(selected?.disease_id), drug_name: selected?.drug_name, availability_status: "reported_available" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not add drug.");
      setForm((old) => ({ ...old, [shopId]: { disease_id: "", drug_name: "" } }));
      setMessage("Drug and disease listing added. It is self-reported and unverified.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add drug."); }
    finally { setBusy(false); }
  }

  async function removeDrug(shopId: number, listingId: number) {
    if (!window.confirm("Remove this drug listing?")) return;
    setError(""); setBusy(true);
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/agrovets/${shopId}/drugs/${listingId}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Could not remove the listing.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove the listing."); }
    finally { setBusy(false); }
  }

  async function toggleAvailability(shopId: number, drug: Drug) {
    setError(""); setMessage(""); setBusy(true);
    const availability_status = drug.availability_status === "reported_available" ? "reported_unavailable" : "reported_available";
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/agrovets/${shopId}/drugs/${drug.id}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease_id: drug.disease_id, drug_name: drug.drug_name, availability_status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not update availability.");
      setMessage("Reported availability updated. This has not been independently verified.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update availability."); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Agrovet account</p>
    <h1 className="mt-2 text-3xl font-semibold text-emerald-950">My agrovet drugs</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Add each drug to an existing assigned agrovet and select the disease record it is listed for. These entries are self-reported; drug registration, treatment suitability and stock are not verified.</p>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {shops === null && !error && <p className="mt-6 text-slate-600">Loading assigned agrovets…</p>}
    {shops?.length === 0 && <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">No agrovet is assigned to this account. An administrator must assign your registered account to an existing agrovet before you can add drugs.</p>}
    <div className="mt-6 space-y-6">{shops?.map((shop) => <article key={shop.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{shop.name}</h2><p className="mt-1 text-sm text-slate-600">{shop.area}, {shop.county}</p>
      <p className="mt-4 text-sm text-slate-600">Existing directory entry: {shop.initial_treatment_name} · {shop.initial_disease_name}. An administrator manages this legacy entry.</p>
      <h3 className="mt-6 font-semibold text-slate-900">Additional drug listings</h3>
      {shop.drugs.length ? <ul className="mt-3 space-y-2">{shop.drugs.map((drug) => <li key={drug.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><strong>{drug.drug_name}</strong><p className="text-sm text-slate-600">Listed for {drug.disease_name} · {drug.availability_status.replaceAll("_", " ")} · updated {new Date(drug.reported_at).toLocaleDateString()}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void toggleAvailability(shop.id, drug)} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800">{drug.availability_status === "reported_available" ? "Mark unavailable" : "Mark available"}</button><button type="button" disabled={busy} onClick={() => void removeDrug(shop.id, drug.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Remove</button></div></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No additional drugs listed yet.</p>}
      <form onSubmit={(event) => void addDrug(event, shop.id)} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">Drug name<input required maxLength={160} value={form[shop.id]?.drug_name ?? ""} onChange={(event) => setForm((old) => ({ ...old, [shop.id]: { disease_id: old[shop.id]?.disease_id ?? "", drug_name: event.target.value } }))} className="field mt-2" /></label>
        <label className="text-sm font-semibold text-slate-800">Disease it is listed for<select required value={form[shop.id]?.disease_id ?? ""} onChange={(event) => setForm((old) => ({ ...old, [shop.id]: { drug_name: old[shop.id]?.drug_name ?? "", disease_id: event.target.value } }))} className="field mt-2"><option value="">Choose disease</option>{diseases.map((disease) => <option key={disease.id} value={disease.id}>{disease.crop} · {disease.name}</option>)}</select></label>
        <button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50 sm:col-span-2">Add drug and disease</button>
      </form>
    </article>)}</div>
  </section>;
}
