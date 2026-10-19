"use client";

import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";

const tables = ["sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "outbreaks"];
type TableData = { table: string; editable_columns: string[]; records: Array<Record<string, unknown>> };

export function AdminTables() {
  const [table, setTable] = useState("diseases");
  const [data, setData] = useState<TableData | null>(null);
  const [draft, setDraft] = useState("{}");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${table}`);
    if (!response.ok) throw new Error("Could not load the table");
    setData(await response.json());
  }

  useEffect(() => { load().catch(() => setMessage("Could not connect to FastAPI.")); }, [table]);

  async function save() {
    try {
      const values = JSON.parse(draft);
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${table}`, {
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
    setDraft(JSON.stringify(values, null, 2));
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  async function update() {
    if (editingId === null) return;
    try {
      const values = JSON.parse(draft);
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${table}/${editingId}`, {
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
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/${table}/${recordId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.detail || "Could not delete record");
      return;
    }
    setMessage(`Deleted record ${recordId}.`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        This admin path edits local demo tables. Any coordinates entered here are test or manually supplied coordinates; they are never represented as verified farmer GPS observations.
      </div>
      <div className="flex flex-wrap gap-2">
        {tables.map((item) => <button key={item} onClick={() => { setTable(item); setMessage(""); setEditingId(null); setDraft("{}"); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${item === table ? "bg-emerald-800 text-white" : "bg-white text-slate-700"}`}>{item.replaceAll("_", " ")}</button>)}
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">{editingId === null ? "Add to" : `Edit record ${editingId} in`} {table.replaceAll("_", " ")}</h2>
        <p className="mt-2 text-sm text-slate-600">Editable fields: {data?.editable_columns.join(", ")}</p>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} spellCheck={false} className="field mt-4 font-mono text-sm" aria-label="New record values as JSON" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={editingId === null ? save : update} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{editingId === null ? "Add simulated record" : "Save changes"}</button>
          {editingId !== null && <button onClick={() => { setEditingId(null); setDraft("{}"); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>}
        </div>
        {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
      </section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-semibold text-slate-950">Current records</h2><p className="mt-1 text-sm text-slate-500">Edit the stored values or remove records that are no longer needed.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{data?.records[0] && Object.keys(data.records[0]).map((key) => <th key={key} className="px-4 py-3">{key.replaceAll("_", " ")}</th>)}<th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{data?.records.map((record) => <tr key={String(record.id)}>{Object.entries(record).map(([key, value]) => <td key={key} className="max-w-xs px-4 py-3 align-top text-slate-700"><span className="line-clamp-4">{String(value ?? "—")}</span></td>)}<td className="whitespace-nowrap px-4 py-3 align-top"><button onClick={() => beginEdit(record)} className="font-semibold text-emerald-700">Edit</button><button onClick={() => remove(Number(record.id))} className="ml-3 font-semibold text-red-700">Delete</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
