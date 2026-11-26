"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { AgrovetLocationOption, DiseaseCaseDetail, DiseaseCaseSummary, NearbyAgrovetsResponse } from "@/lib/types";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ReviewBadge({ status }: { status: DiseaseCaseSummary["expert_approval"] }) {
  const labels = { pending: "Awaiting expert review", approved: "Expert review completed", rejected: "Expert review completed" };
  const colors = { pending: "bg-amber-100 text-amber-900", approved: "bg-emerald-100 text-emerald-900", rejected: "bg-slate-200 text-slate-800" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${colors[status]}`}>{labels[status]}</span>;
}

export function DiseaseCases() {
  const [cases, setCases] = useState<DiseaseCaseSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases`, { credentials: "include", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<DiseaseCaseSummary[]> : Promise.reject(new Error(response.status === 401 ? "Please log in to view your saved cases." : "Could not load your saved cases.")))
      .then(setCases)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load your saved cases."));
  }, []);

  return <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Your crop health history</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-tight text-emerald-950">My disease cases</h1>
    <p className="mt-3 max-w-2xl leading-7 text-slate-600">Track only observations you chose to save for expert review. Review decisions are not a laboratory diagnosis.</p>
    {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
    {cases === null && !error && <p className="mt-8 text-slate-600">Loading your saved cases…</p>}
    {cases?.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center"><h2 className="text-xl font-semibold text-emerald-950">No saved cases yet</h2><p className="mt-2 text-slate-600">When you select “Save for expert review” during an analysis, it will appear here.</p><Link href="/disease" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white">Find possible causes</Link></div>}
    <div className="mt-8 space-y-4">{cases?.map((item) => <Link key={item.id} href={`/disease/cases/${item.id}`} className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">{item.crop || "Crop observation"}</h2><p className="mt-1 text-sm text-slate-600">{item.location_label} · {item.season}</p></div><ReviewBadge status={item.expert_approval} /></div>
      <p className="mt-4 text-sm text-slate-600">{item.reviewed_disease_name ? `Reviewed disease: ${item.reviewed_disease_name}` : item.possible_matches.length ? `AI possible matches: ${item.possible_matches.join(", ")}` : "More details were requested before possible matches could be shown."}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted {formatDate(item.created_at)} · Open case →</p>
    </Link>)}</div>
  </section>;
}

export function DiseaseCase({ caseId }: { caseId: number }) {
  const [item, setItem] = useState<DiseaseCaseDetail | null>(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${caseId}`, { credentials: "include", cache: "no-store" })
    .then(async (response) => response.ok ? response.json() as Promise<DiseaseCaseDetail> : Promise.reject(new Error(response.status === 404 ? "This case is unavailable." : "Could not load this case.")))
    .then(setItem).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load this case.")), [caseId]);
  useEffect(() => { void load(); }, [load]);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError("");
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${caseId}/comments`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: comment }) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.detail || "Could not add your comment."); return; }
    setComment(""); setMessage("Your comment was added to this case."); await load();
  }

  if (error && !item) return <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8"><Link href="/disease/cases" className="font-semibold text-emerald-700 underline">← My cases</Link><p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p></section>;
  if (!item) return <p className="mx-auto max-w-4xl px-5 py-10 text-slate-600 sm:px-8">Loading case…</p>;
  return <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
    <Link href="/disease/cases" className="font-semibold text-emerald-700 underline">← My cases</Link>
    <div className="mt-6 rounded-3xl bg-emerald-950 p-6 text-white sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-emerald-200">Submitted {formatDate(item.created_at)}</p><h1 className="mt-2 text-3xl font-semibold">{item.crop || "Crop observation"}</h1><p className="mt-2 text-emerald-100">{item.location_label} · {item.season}</p><p className="mt-3 text-sm text-emerald-100">{item.reviewed_disease_name ? "Reviewed disease" : item.expert_approval === "pending" ? "AI possible match" : "Review outcome"}: <strong>{item.reviewed_disease_name || (item.expert_approval === "pending" ? item.possible_matches[0] : null) || "No reviewed disease recorded"}</strong></p><a href="#nearby-agrovets" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 font-semibold text-emerald-900">Nearby Agrovets ↓</a></div><ReviewBadge status={item.expert_approval} /></div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Expert review</h2><p className="mt-3 leading-7 text-slate-700">{item.expert_review_note || "An expert has not added a review note yet. Your saved observation remains pending."}</p></article><article className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Possible matches</h2>{item.possible_matches.length ? <ul className="mt-3 space-y-2 text-slate-700">{item.possible_matches.map((match) => <li key={match}>• {match}</li>)}</ul> : <p className="mt-3 text-slate-600">No possible matches were saved for this request.</p>}</article></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Your observation</h2><dl className="mt-4 space-y-3 text-sm text-slate-700"><div><dt className="font-semibold">Symptoms</dt><dd>{item.symptoms || "Not supplied"}</dd></div><div><dt className="font-semibold">Affected part</dt><dd>{item.affected_part || "Not supplied"}</dd></div><div><dt className="font-semibold">Spread pattern</dt><dd>{item.spread_pattern || "Not supplied"}</dd></div></dl></article><article className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Next steps from the analysis</h2>{item.next_actions.length ? <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">{item.next_actions.map((action, index) => <li key={action}>{index + 1}. {action}</li>)}</ol> : <p className="mt-3 text-slate-600">No next steps were saved.</p>}</article></div>
    <CaseNearbyAgrovets item={item} />
    <article className="mt-5 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Your comments</h2><p className="mt-1 text-sm text-slate-600">Add details or a follow-up question to keep with this saved case.</p><div className="mt-4 space-y-3">{item.comments.length ? item.comments.map((entry) => <div key={entry.id} className="rounded-2xl bg-slate-50 p-4"><p className="whitespace-pre-wrap text-slate-800">{entry.body}</p><p className="mt-2 text-xs text-slate-500">{formatDate(entry.created_at)}</p></div>) : <p className="text-sm text-slate-600">No comments yet.</p>}</div><form onSubmit={submitComment} className="mt-5"><label className="text-sm font-semibold text-slate-800">Add a comment<textarea value={comment} onChange={(event) => setComment(event.target.value)} required maxLength={4000} rows={4} className="field mt-2" placeholder="For example: the spots have spread since I submitted this case." /></label><button className="mt-3 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Add comment</button></form>{message && <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</article>
  </section>;
}

function CaseNearbyAgrovets({ item }: { item: DiseaseCaseDetail }) {
  const reviewed = item.expert_approval === "approved" && Boolean(item.reviewed_disease_id);
  const requestSequence = useRef(0);
  const [locations, setLocations] = useState<AgrovetLocationOption[]>([]);
  const [county, setCounty] = useState(item.county ?? "");
  const [area, setArea] = useState(item.area ?? "");
  const [result, setResult] = useState<NearbyAgrovetsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!reviewed) return;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${item.id}/agrovet-locations`, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setLocations)
      .catch(() => setError("Could not load agrovet areas for this disease."));
  }, [item.id, reviewed]);
  const selectableLocations = item.county && item.area ? [{ county: item.county, area: item.area }, ...locations] : locations;
  const counties = [...new Set(selectableLocations.map((location) => location.county))];
  const areas = [...new Set(selectableLocations.filter((location) => location.county === county).map((location) => location.area))];
  const search = useCallback(async (selectedCounty: string, selectedArea: string) => {
    if (!reviewed || !selectedCounty || !selectedArea) return;
    const request = ++requestSequence.current;
    setLoading(true); setError(""); setResult(null);
    try {
      const params = new URLSearchParams({ county: selectedCounty, area: selectedArea });
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${item.id}/nearby-agrovets?${params}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not load nearby agrovets.");
      if (request === requestSequence.current) setResult(payload as NearbyAgrovetsResponse);
    } catch (reason) { if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Could not load nearby agrovets."); }
    finally { if (request === requestSequence.current) setLoading(false); }
  }, [item.id, reviewed]);
  useEffect(() => {
    if (!reviewed || !item.county || !item.area) return;
    let active = true;
    const initialCounty = item.county;
    const initialArea = item.area;
    queueMicrotask(() => { if (active) void search(initialCounty, initialArea); });
    return () => { active = false; requestSequence.current += 1; };
  }, [item.county, item.area, reviewed, search]);
  return <section id="nearby-agrovets" className="mt-5 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-semibold text-slate-950">Nearby Agrovets</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Filter listings by your selected county and area and this case&apos;s reviewed disease. The case location is a starting point. Listings do not verify distance, stock, licence or treatment approval.</p>
    {!reviewed && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{item.expert_approval === "pending" ? "This case is awaiting expert review. The disease filter and search become available after a disease is approved." : item.expert_approval === "rejected" ? "The possible disease was rejected during review, so no disease-specific lookup is available." : "An administrator must select the reviewed disease before this lookup is available."}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-semibold text-slate-800">County<select className="field mt-2" value={county} onChange={(event) => { requestSequence.current += 1; setLoading(false); setCounty(event.target.value); setArea(""); setResult(null); }}><option value="">Choose county</option>{counties.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-800">Area<select className="field mt-2" value={area} onChange={(event) => { requestSequence.current += 1; setLoading(false); setArea(event.target.value); setResult(null); }}><option value="">Choose area</option>{areas.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-800">Current reviewed disease<input className="field mt-2 bg-slate-50" value={reviewed ? item.reviewed_disease_name ?? "Reviewed disease" : "Awaiting expert review"} readOnly aria-describedby="nearby-disease-note" /></label>
    </div>
    <p id="nearby-disease-note" className="mt-2 text-xs text-slate-600">The disease comes from the expert review of this case and cannot be changed in this search.</p>
    <button type="button" onClick={() => void search(county, area)} disabled={!reviewed || !county || !area || loading} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{loading ? "Checking…" : "Find matching agrovets"}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {result && <div className="mt-4"><p className="font-semibold text-slate-900">Matches for {item.reviewed_disease_name} in {result.area}, {result.county}</p><p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{result.notice}</p>{result.agrovets.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{result.agrovets.map((shop, index) => <CaseAgrovetCard key={`${shop.name}-${shop.address}-${shop.treatment_name}-${index}`} shop={shop} area={result.area} county={result.county} />)}</ul> : <p className="mt-3 text-sm text-slate-600">No simulated listing matches this county, area and reviewed disease.</p>}</div>}
  </section>;
}

function CaseAgrovetCard({ shop, area, county }: {
  shop: NearbyAgrovetsResponse["agrovets"][number];
  area: string;
  county: string;
}) {
  return <li className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h3 className="text-lg font-semibold text-slate-950">{shop.name}</h3>
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">{shop.evidence_status.replaceAll("_", " ")}</span>
    </div>
    <p className="mt-1 text-sm text-slate-600">{area}, {county} · listed for {shop.disease}</p>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2"><dt className="font-semibold text-slate-800">Listed drug or service</dt><dd className="mt-1 break-words text-slate-700">{shop.treatment_name}</dd></div>
      <div><dt className="font-semibold text-slate-800">Phone</dt><dd className="mt-1 break-words text-slate-700">{shop.phone_number || "Not provided"}</dd></div>
      <div><dt className="font-semibold text-slate-800">Indicative cost</dt><dd className="mt-1 break-words text-slate-700">{shop.indicative_cost_kes || "Not available"}</dd></div>
      <div className="sm:col-span-2"><dt className="font-semibold text-slate-800">Address</dt><dd className="mt-1 break-words text-slate-700">{shop.address || "Not provided"}</dd></div>
    </dl>
    <div className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
      <p><span className="font-semibold">Source:</span> {shop.source.name} · {formatDate(shop.source.date)}</p>
      <p><span className="font-semibold">Coverage:</span> {shop.source.geographic_scope}</p>
      <p><span className="font-semibold">Limitations:</span> {shop.source.limitations}</p>
    </div>
  </li>;
}
