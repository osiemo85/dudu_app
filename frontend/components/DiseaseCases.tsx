"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { AgrovetLocationOption, DiseaseCaseDetail, DiseaseCaseSummary, NearbyAgrovetsResponse } from "@/lib/types";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ReviewBadge({ status }: { status: DiseaseCaseSummary["expert_approval"] }) {
  const labels = { pending: "Awaiting review", approved: "Reviewed", rejected: "Not confirmed" };
  const colors = { pending: "bg-amber-100 text-amber-950", approved: "bg-emerald-100 text-emerald-950", rejected: "bg-slate-200 text-slate-900" };
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${colors[status]}`}>{labels[status]}</span>;
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
  const [authRequired, setAuthRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${caseId}`, { credentials: "include", cache: "no-store" })
    .then(async (response) => {
      setAuthRequired(response.status === 401);
      if (!response.ok) throw new Error(response.status === 401 ? "Please log in to view this saved case." : response.status === 404 ? "This case is unavailable." : "Could not load this case. Please try again.");
      return response.json() as Promise<DiseaseCaseDetail>;
    })
    .then(setItem)
    .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load this case. Please try again.")), [caseId]);
  useEffect(() => { void load(); }, [load]);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError(""); setSubmitting(true);
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${caseId}/comments`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: comment.trim() }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || "Could not add your update. Please try again.");
      setComment(""); setMessage("Update added to this case."); await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add your update. Please try again.");
    } finally { setSubmitting(false); }
  }

  if (error && !item) return <section className="mx-auto w-full max-w-5xl py-6"><Link href="/disease/cases" className="inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-800"><Icon name="back" size={18} /> My crop health cases</Link><div className="mt-5 rounded-3xl border border-[#dce5d8] bg-white p-6 sm:p-8"><h1 className="text-2xl font-semibold text-slate-950">Case unavailable</h1><p role="alert" className="mt-3 text-slate-700">{error}</p>{authRequired ? <Link href="/account/login" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#17462f] px-5 py-2.5 font-semibold text-white">Log in</Link> : <button type="button" onClick={() => { setError(""); void load(); }} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#17462f] px-5 py-2.5 font-semibold text-white">Try again</button>}</div></section>;
  if (!item) return <div className="mx-auto max-w-5xl animate-pulse space-y-5 py-6" role="status" aria-label="Loading case"><div className="h-6 w-32 rounded bg-slate-200" /><div className="h-56 rounded-3xl bg-slate-200" /><div className="h-40 rounded-3xl bg-slate-200" /></div>;
  const approved = item.expert_approval === "approved" && Boolean(item.reviewed_disease_id);
  const outcome = approved ? item.reviewed_disease_name : item.expert_approval === "rejected" ? "No disease confirmed" : "Expert review pending";
  return <section className="mx-auto w-full max-w-5xl pb-10 pt-1 sm:pb-16">
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm font-semibold text-emerald-900"><Link href="/disease/cases" className="inline-flex min-h-11 items-center gap-2 rounded-lg hover:text-emerald-700"><Icon name="back" size={17} /> My crop health cases</Link><span aria-hidden="true" className="text-slate-400">/</span><span aria-current="page" className="text-slate-600">Case {item.id}</span></nav>
    <header className="overflow-hidden rounded-[28px] bg-[#17462f] text-white shadow-[0_18px_50px_-35px_rgba(23,70,47,.7)]">
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Crop health case · #{item.id}</p><h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{item.crop || "Crop observation"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100 sm:text-base">Submitted {formatDate(item.created_at)}</p></div>
        <div className="justify-self-start"><ReviewBadge status={item.expert_approval} /></div>
      </div>
      <div className="grid gap-px bg-white/15 sm:grid-cols-2"><div className="flex min-w-0 items-center gap-3 bg-[#205338] px-5 py-3.5 sm:px-8"><Icon name="pin" size={18} /><div className="min-w-0"><p className="text-xs text-emerald-200">Location used</p><p className="break-words font-medium">{item.location_label || "Not recorded"}</p></div></div><div className="flex min-w-0 items-center gap-3 bg-[#205338] px-5 py-3.5 sm:px-8"><Icon name="sun" size={18} /><div className="min-w-0"><p className="text-xs text-emerald-200">Season used</p><p className="break-words font-medium">{item.season || "Not recorded"}</p></div></div></div>
    </header>
    <p className="mt-3 text-sm text-slate-600">Location or season incorrect? <Link href="/disease" className="font-semibold text-emerald-800 underline underline-offset-2">Start a new crop check</Link> with the right context.</p>

    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)] lg:items-start">
      <div className="min-w-0 space-y-5">
        <article className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon name="clipboard" size={21} /></span><h2 className="text-xl font-semibold text-slate-950">Expert review</h2></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{approved ? "Reviewed disease" : "Current outcome"}</p><p className="mt-1 break-words text-2xl font-semibold leading-tight text-[#17462f] sm:text-3xl">{outcome || "Review recorded"}</p><p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">{item.expert_review_note || (item.expert_approval === "pending" ? "An expert has not reviewed this case yet. You can add an update below if your crop changes." : "No review note was recorded. Ask an extension officer if you need help interpreting this outcome.")}</p>{approved && <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">A reviewed case is not a laboratory diagnosis. Confirm treatment choices with a qualified extension officer and follow the product label.</p>}</article>
        {item.expert_approval === "pending" && item.next_actions.length > 0 && <article className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold text-slate-950">While you wait</h2><p className="mt-1 text-sm text-slate-600">Suggestions saved from the initial analysis. Confirm any treatment with an extension officer.</p><ol className="mt-5 space-y-4">{item.next_actions.map((action, index) => <li key={`${index}-${action}`} className="flex gap-3 text-base leading-6 text-slate-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-900">{index + 1}</span><span className="min-w-0 break-words">{action}</span></li>)}</ol></article>}
      </div>
      <div className="min-w-0 space-y-5">
        <article className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold text-slate-950">Your observation</h2><p className="mt-1 text-sm text-slate-600">Information you supplied with this case.</p><dl className="mt-5 divide-y divide-slate-100 text-sm"><div className="py-3 first:pt-0"><dt className="font-semibold text-slate-500">Symptoms</dt><dd className="mt-1 whitespace-pre-wrap break-words text-base leading-6 text-slate-900">{item.symptoms || "Not supplied"}</dd></div><div className="py-3"><dt className="font-semibold text-slate-500">Affected part</dt><dd className="mt-1 text-base text-slate-900">{item.affected_part || "Not supplied"}</dd></div><div className="py-3 last:pb-0"><dt className="font-semibold text-slate-500">Spread pattern</dt><dd className="mt-1 whitespace-pre-wrap break-words text-base text-slate-900">{item.spread_pattern || "Not supplied"}</dd></div></dl></article>
        <article className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold text-slate-950">Original AI possibilities</h2><p className="mt-1 text-sm leading-6 text-slate-600">These were possible matches before expert review, not confirmed diagnoses.</p>{item.possible_matches.length ? <ul className="mt-4 flex flex-wrap gap-2">{item.possible_matches.map((match, index) => <li key={`${index}-${match}`} className="max-w-full break-words rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">{match}</li>)}</ul> : <p className="mt-4 text-sm text-slate-600">No possible match was saved.</p>}</article>
      </div>
    </div>
    {approved && <CaseNearbyAgrovets item={item} />}
    <article id="case-updates" className="mt-6 scroll-mt-6 rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-semibold text-slate-950">Case updates</h2><p className="mt-1 text-sm text-slate-600">Keep new observations or a follow-up question with this case.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.comments.length} {item.comments.length === 1 ? "update" : "updates"}</span></div>{item.comments.length > 0 && <div className="mt-5 space-y-3">{item.comments.map((entry) => <div key={entry.id} className="rounded-2xl border border-slate-100 bg-[#f8faf6] p-4"><p className="whitespace-pre-wrap break-words text-base leading-6 text-slate-800">{entry.body}</p><p className="mt-2 text-xs font-medium text-slate-500">{formatDate(entry.created_at)}</p></div>)}</div>}<form onSubmit={submitComment} className="mt-5 border-t border-slate-100 pt-5"><label htmlFor="case-comment" className="block text-sm font-semibold text-slate-900">Add an update</label><textarea id="case-comment" value={comment} onChange={(event) => setComment(event.target.value)} required maxLength={4000} rows={3} className="field mt-2 resize-y" placeholder="For example, the spots have spread to other leaves." /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Visible only in your saved case.</p><button disabled={submitting || !comment.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17462f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#205338] disabled:opacity-50"><Icon name="send" size={17} />{submitting ? "Adding…" : "Add update"}</button></div></form>{message && <p role="status" className="mt-3 text-sm font-medium text-emerald-800">{message}</p>}{error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}</article>
    <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-600">This case uses simulated local evidence. The original AI suggestions and directory listings are not verified field conditions or treatment approvals.</p>
  </section>;
}

function CaseNearbyAgrovets({ item }: { item: DiseaseCaseDetail }) {
  const requestSequence = useRef(0);
  const [locations, setLocations] = useState<AgrovetLocationOption[]>([]);
  const [county, setCounty] = useState(item.county ?? "");
  const [area, setArea] = useState(item.area ?? "");
  const [result, setResult] = useState<NearbyAgrovetsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/cases/${item.id}/agrovet-locations`, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setLocations)
      .catch(() => setError("Could not load directory areas. Please try again later."));
  }, [item.id]);
  const selectableLocations = item.county && item.area ? [{ county: item.county, area: item.area }, ...locations] : locations;
  const counties = [...new Set(selectableLocations.map((location) => location.county))];
  const areas = [...new Set(selectableLocations.filter((location) => location.county === county).map((location) => location.area))];
  const search = useCallback(async (selectedCounty: string, selectedArea: string) => {
    if (!selectedCounty || !selectedArea) return;
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
  }, [item.id]);
  useEffect(() => {
    if (!item.county || !item.area) return;
    let active = true;
    const initialCounty = item.county;
    const initialArea = item.area;
    queueMicrotask(() => { if (active) void search(initialCounty, initialArea); });
    return () => { active = false; requestSequence.current += 1; };
  }, [item.county, item.area, search]);
  return <section id="nearby-agrovets" className="mt-6 scroll-mt-6 rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">After review</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Local agrovet directory</h2></div><span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950">Simulated listings</span></div>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Explore records for the reviewed disease in a county and area you choose. Listings do not verify distance, stock, licensing, or approved treatment.</p>
    <div className="mt-5 rounded-2xl bg-[#f1f6ed] px-4 py-3 text-sm"><span className="font-semibold text-slate-600">Reviewed disease used for this search</span><p className="mt-0.5 break-words font-semibold text-[#17462f]">{item.reviewed_disease_name}</p></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="text-sm font-semibold text-slate-800">County<select className="field mt-2" value={county} onChange={(event) => { requestSequence.current += 1; setLoading(false); setCounty(event.target.value); setArea(""); setResult(null); }}><option value="">Choose county</option>{counties.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-800">Area<select className="field mt-2" value={area} onChange={(event) => { requestSequence.current += 1; setLoading(false); setArea(event.target.value); setResult(null); }}><option value="">Choose area</option>{areas.map((value) => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={() => void search(county, area)} disabled={!county || !area || loading} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#17462f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#205338] disabled:opacity-50"><Icon name="search" size={17} />{loading ? "Checking…" : "Find listings"}</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {result && <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-lg font-semibold text-slate-950">{result.agrovets.length} {result.agrovets.length === 1 ? "listing" : "listings"} in {result.area}, {result.county}</h3><p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">{result.notice}</p>{result.agrovets.length ? <ul className="mt-4 grid gap-3 lg:grid-cols-2">{result.agrovets.map((shop, index) => <CaseAgrovetCard key={`${shop.name}-${shop.address}-${shop.treatment_name}-${index}`} shop={shop} area={result.area} county={result.county} />)}</ul> : <p className="mt-4 text-sm text-slate-600">No directory records match this area and reviewed disease. An extension officer can help you find local support.</p>}</div>}
  </section>;
}

function CaseAgrovetCard({ shop, area, county }: {
  shop: NearbyAgrovetsResponse["agrovets"][number];
  area: string;
  county: string;
}) {
  return <li className="min-w-0 rounded-2xl border border-[#dce5d8] bg-[#fafbf8] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 break-words text-lg font-semibold text-slate-950">{shop.name}</h4><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold capitalize text-amber-950">{shop.evidence_status.replaceAll("_", " ")}</span></div>
    <p className="mt-1 text-sm text-slate-600">{area}, {county}</p>
    <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2"><div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Listed product or service</dt><dd className="mt-1 break-words text-base font-medium text-slate-900">{shop.treatment_name}</dd></div><div><dt className="font-semibold text-slate-500">Phone</dt><dd className="mt-1 break-words text-slate-900">{shop.phone_number ? <a className="font-semibold text-emerald-800 underline underline-offset-2" href={`tel:${shop.phone_number.replace(/[^+\d]/g, "")}`}>{shop.phone_number}</a> : "Not provided"}</dd></div><div><dt className="font-semibold text-slate-500">Indicative cost</dt><dd className="mt-1 break-words text-slate-900">{shop.indicative_cost_kes || "Not available"}</dd></div><div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Recorded address</dt><dd className="mt-1 break-words text-slate-900">{shop.address || "Not provided"}</dd></div></dl>
    <div className="mt-4 border-t border-[#dce5d8] pt-4 text-xs leading-5 text-slate-600"><p><strong>Source:</strong> {shop.source.name} · {formatDate(shop.source.date)} · {shop.source.evidence_status.replaceAll("_", " ")}</p><p><strong>Coverage:</strong> {shop.source.geographic_scope}</p><p><strong>Limitations:</strong> {shop.source.limitations}</p></div>
  </li>;
}
