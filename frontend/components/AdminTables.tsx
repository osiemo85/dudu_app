"use client";

import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";

const tablesByModule = {
  "crop-health": ["disease_cases","sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "agrovets", "outbreaks"],
  planting: ["sources", "locations", "counties", "areas", "seasons", "crops", "varieties", "area_season_varieties", "management_plans", "management_stages", "inputs", "stage_inputs", "stage_treatments", "suppliers", "supplier_varieties", "area_season_climate", "planting_calendars", "weather_forecasts", "extension_advice", "indigenous_knowledge", "input_records"],
} as const;
type AdminModule = keyof typeof tablesByModule;
type TableName = (typeof tablesByModule)[AdminModule][number];
const tableDescriptions: Record<TableName, string> = {
  disease_cases: "Consented disease case history: farmer observations, agent identities and runs, findings, source evidence, and officer review. AI findings remain unverified.",
  sources: "Attributable evidence sources, including their date, geographic coverage, status, and limitations.",
  locations: "Demo counties and areas with manually supplied test coordinates and agro-ecological context.",
  seasons: "County-specific sample season periods and the evidence basis used to resolve them.",
  diseases: "Possible crop disease matches, their summaries, and supporting evidence references.",
  disease_symptoms: "Weighted symptom signals linked to each possible disease match.",
  treatments: "Source-backed, bounded treatment actions for a crop and disease; not pesticide prescriptions.",
  agrovets: "Simulated area-matched agrovet directory and indicative service costs; never current stock, price, approval, or routing information.",
  outbreaks: "Historical records and LLM observations awaiting expert approval; never live outbreak alerts.",
  crops: "Crop profiles with water needs, maturity range, risk notes, and supporting evidence.",
  counties: "Demo counties used by the area tables.",
  areas: "Areas linked to counties; coordinates are manually supplied test points.",
  varieties: "Demo varieties linked to crop species, including sample maturity durations.",
  area_season_varieties: "Simulated area and season suitability for varieties; not validated advice.",
  management_plans: "Plans for each area, season and variety. Edit rain needs and the weeding count here; edit individual timing and inputs in the stage tables.",
  management_stages: "Edit each stage, its days relative to planting, weeding round, weather needs and activities.",
  inputs: "Master list of illustrative farming inputs.",
  stage_inputs: "Edit inputs and quantities per acre for each stage. Sample numbers are fictional and not validated recommendations.",
  stage_treatments: "Stage-linked treatment records; unverified pesticide instructions are not shown to farmers.",
  suppliers: "Fictional demo suppliers. These records do not verify business details or inventory.",
  supplier_varieties: "Demo supplier and variety links. Prices and availability are not current or verified.",
  area_season_climate: "Simulated seasonal climate expectations for an area, not a live forecast.",
  planting_calendars: "Location- and season-specific planting windows, suitability, rationale, and practical steps.",
  weather_forecasts: "Dated simulated rainfall scenarios and their planning implications; not current forecasts.",
  extension_advice: "Simulated, local crop and season guidance for planning decisions.",
  indigenous_knowledge: "Community-attributed local guidance with its permission and validation status.",
  input_records: "Input categories with geographic scope, certification status, availability status, and guidance.",
};
type TableData = { table: string; editable_columns: string[]; records: Array<Record<string, unknown>> };

function formatEvidence(value: string): string {
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

export function AdminTables({ module }: { module: AdminModule }) {
  const tables = tablesByModule[module];
  const [table, setTable] = useState<TableName>(tables[0]);
  const [data, setData] = useState<TableData | null>(null);
  const [draft, setDraft] = useState("{}");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [reviewingOutbreakId, setReviewingOutbreakId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const visibleKeys = data?.records[0] ? Object.keys(data.records[0]).filter((key) => !(table === "outbreaks" && key === "evidence_json")) : [];

  async function load() {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${module}/${table}`);
    if (!response.ok) throw new Error("Could not load the table");
    setData(await response.json());
  }

  useEffect(() => {
    let ignoreResponse = false;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${module}/${table}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => { if (!ignoreResponse) setData(payload); })
      .catch(() => { if (!ignoreResponse) setMessage("Could not connect to FastAPI."); });
    return () => { ignoreResponse = true; };
  }, [module, table]);

  async function save() {
    try {
      const values = JSON.parse(draft);
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${module}/${table}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not add record");
      setMessage(`Added record ${payload.id}. Coordinates entered here are manually supplied demo data.`);
      setDraft("{}");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid JSON"); }
  }

  function beginEdit(record: Record<string, unknown>) {
    const { id, ...values } = record;
    setEditingId(Number(id));
    setDraft(JSON.stringify(Object.fromEntries(Object.entries(values).filter(([key]) => data?.editable_columns.includes(key))), null, 2));
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  async function update() {
    if (editingId === null) return;
    try {
      const values = JSON.parse(draft);
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${module}/${table}/${editingId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not update record");
      setMessage(`Updated record ${editingId}.`);
      setEditingId(null);
      setDraft("{}");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid JSON"); }
  }

  async function remove(recordId: number) {
    if (!window.confirm(`Delete ${table} record ${recordId}?`)) return;
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${module}/${table}/${recordId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.detail || "Could not delete record");
      return;
    }
    setMessage(`Deleted record ${recordId}.`);
    await load();
  }

  async function reviewOutbreak(decision: "approved" | "rejected") {
    if (reviewingOutbreakId === null) return;
    if (!reviewComment.trim()) {
      setMessage("Add an expert review comment before deciding.");
      return;
    }
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/outbreaks/${reviewingOutbreakId}/review`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment: reviewComment }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.detail || "Could not save the expert decision.");
      return;
    }
    setMessage(`Outbreak review ${decision}.`);
    setReviewingOutbreakId(null);
    setReviewComment("");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        This admin path edits local demo tables. Any coordinates entered here are test or manually supplied coordinates; they are never represented as verified farmer GPS observations.
      </div>
      <div className="flex flex-wrap gap-2">
        {tables.map((item) => <button key={item} onClick={() => { setTable(item); setData(null); setMessage(""); setEditingId(null); setDraft("{}"); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${item === table ? "bg-emerald-800 text-white" : "bg-white text-slate-700"}`}>{item.replaceAll("_", " ")}</button>)}
      </div>
      {(table !== "disease_cases" || editingId !== null) && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">{editingId === null ? "Add to" : `Edit record ${editingId} in`} {table.replaceAll("_", " ")}</h2>
        <p className="mt-1 text-sm text-slate-500">{tableDescriptions[table]}</p>
        <p className="mt-2 text-sm text-slate-600">Editable fields: {data?.editable_columns.join(", ")}</p>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} spellCheck={false} className="field mt-4 font-mono text-sm" aria-label="New record values as JSON" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={editingId === null ? save : update} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{editingId === null ? "Add simulated record" : "Save changes"}</button>
          {editingId !== null && <button onClick={() => { setEditingId(null); setDraft("{}"); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>}
        </div>
      </section>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      {reviewingOutbreakId !== null && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Review outbreak analysis #{reviewingOutbreakId}</h2>
        <p className="mt-1 text-sm text-slate-600">Record an expert comment, then approve or reject this AI analysis.</p>
        <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={4} className="field mt-4" placeholder="Explain the evidence supporting this decision." aria-label="Expert review comment" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => reviewOutbreak("approved")} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Approve analysis</button>
          <button onClick={() => reviewOutbreak("rejected")} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white">Reject analysis</button>
          <button onClick={() => { setReviewingOutbreakId(null); setReviewComment(""); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
        </div>
      </section>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-semibold text-slate-950">Current records</h2><p className="mt-1 text-sm text-slate-500">{tableDescriptions[table]}</p><p className="mt-2 text-sm text-slate-500">Open evidence details to inspect the full record. Case history preserves the original findings; only review status and notes are editable.</p></div>
        <div className="overflow-x-auto">
          {data?.records.length === 0 && <p className="p-5 text-sm text-slate-600">{table === "disease_cases" ? "No records yet. Submit an observation with Save for expert review selected to create case history." : "No records yet. Add a simulated record above."}</p>}
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{visibleKeys.map((key) => <th key={key} className="px-4 py-3">{key.replaceAll("_", " ")}</th>)}<th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{data?.records.map((record) => <tr key={String(record.id)}>{visibleKeys.map((key) => {
              const value = record[key];
              if (key === "expert_approval" && table === "outbreaks" && record.llm_identified === 1) return <td key={key} className="max-w-xs px-4 py-3 align-top text-slate-700"><span className="block capitalize">{String(value)}</span><button onClick={() => { setReviewingOutbreakId(Number(record.id)); setReviewComment(String(record.expert_review_note ?? "")); }} className="mt-2 font-semibold text-emerald-700">Approve / reject</button></td>;
              if (key === "image_path" && value && table === "outbreaks") return <td key={key} className="max-w-xs px-4 py-3 align-top text-slate-700"><a className="font-semibold text-emerald-700 underline" href={`${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/outbreaks/${record.id}/image`} target="_blank" rel="noreferrer">Open photo</a><span className="mt-2 block break-all text-xs text-slate-500">{String(value)}</span></td>;
              if (key.endsWith("_json") && typeof value === "string") return <td key={key} className="max-w-xs px-4 py-3 align-top text-slate-700"><details><summary className="cursor-pointer font-semibold text-emerald-700">View {key.replaceAll("_", " ").replace(" json", "")}</summary><pre className="mt-2 max-h-96 min-w-72 overflow-auto whitespace-pre-wrap break-words text-xs">{formatEvidence(value)}</pre></details></td>;
              return <td key={key} className="max-w-xs px-4 py-3 align-top text-slate-700"><span className="line-clamp-4">{String(value ?? "—")}</span></td>;
            })}<td className="whitespace-nowrap px-4 py-3 align-top"><button onClick={() => beginEdit(record)} className="font-semibold text-emerald-700">Edit</button>{table !== "disease_cases" && <button onClick={() => remove(Number(record.id))} className="ml-3 font-semibold text-red-700">Delete</button>}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
