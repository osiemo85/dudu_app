"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import { RecordModal } from "./RecordModal";
import { Icon } from "./Icon";

export const cropHealthTables = ["disease_cases", "sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "agrovets", "agrovet_drugs", "outbreaks"] as const;
export type CropHealthTable = (typeof cropHealthTables)[number];
type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "date" | "select" | "checkbox"; options?: string[]; reference?: CropHealthTable | "users"; optional?: boolean };
type TableConfig = { label: string; description: string; fields: Field[]; filters?: string[]; immutable?: boolean };
type Option = { id: number; label: string; crop?: string };
type TableData = { editable_columns: string[]; records: Array<Record<string, unknown>>; total: number; page: number; page_size: number; reference_options: Record<string, Option[]> };
const statuses = ["simulated", "manually_supplied", "awaiting_validation", "verified"];
const configs: Record<CropHealthTable, TableConfig> = {
  disease_cases: { label: "Disease cases", description: "Consented farmer case history. AI suggestions remain separate from expert corrections.", immutable: true, filters: ["expert_approval"], fields: [{ key: "crop", label: "Crop" }, { key: "location_label", label: "Location" }, { key: "season_label", label: "Season" }, { key: "expert_approval", label: "Status", type: "select", options: ["approved", "rejected"] }, { key: "identified_disease", label: "Identified disease" }, { key: "reviewed_disease_id", label: "Reviewed disease", type: "select", reference: "diseases", optional: true }, { key: "expert_review_note", label: "Expert review comment", type: "textarea" }] },
  sources: { label: "Sources", description: "Attributable simulated evidence used by this demo.", filters: ["evidence_status"], fields: [{ key: "name", label: "Source name" }, { key: "source_date", label: "Date or period" }, { key: "geographic_scope", label: "Geographic coverage" }, { key: "evidence_status", label: "Evidence status", type: "select", options: statuses }, { key: "limitations", label: "Limitations", type: "textarea" }] },
  locations: { label: "Locations", description: "Demo counties and areas. Coordinates are manually supplied test data, not verified farmer GPS.", filters: ["county", "evidence_status"], fields: [{ key: "county", label: "County" }, { key: "area", label: "Area" }, { key: "latitude", label: "Latitude", type: "number" }, { key: "longitude", label: "Longitude", type: "number" }, { key: "agro_ecological_context", label: "Agro-ecological context", type: "textarea" }, { key: "evidence_status", label: "Evidence status", type: "select", options: statuses }] },
  seasons: { label: "Seasons", description: "County-specific sample season periods and their evidence basis.", filters: ["county"], fields: [{ key: "county", label: "County" }, { key: "label", label: "Season" }, { key: "period", label: "Period" }, { key: "start_month", label: "Start month", type: "number" }, { key: "end_month", label: "End month", type: "number" }, { key: "basis", label: "Evidence basis", type: "textarea" }, { key: "source_id", label: "Source", type: "select", reference: "sources" }] },
  diseases: { label: "Diseases", description: "Possible disease matches used for bounded symptom matching—not confirmed diagnoses.", filters: ["crop", "evidence_status"], fields: [{ key: "crop", label: "Crop" }, { key: "common_name", label: "Common name" }, { key: "scientific_name", label: "Scientific name", optional: true }, { key: "summary", label: "Summary", type: "textarea" }, { key: "source_id", label: "Source", type: "select", reference: "sources" }, { key: "evidence_status", label: "Evidence status", type: "select", options: statuses }] },
  disease_symptoms: { label: "Disease symptoms", description: "Weighted symptom signals linked to a possible disease match. Plant parts use the same exact values as the farmer form.", fields: [{ key: "disease_id", label: "Possible disease", type: "select", reference: "diseases" }, { key: "plant_part", label: "Plant part", type: "select" }, { key: "symptom", label: "Symptom" }, { key: "weight", label: "Match weight", type: "number" }] },
  treatments: { label: "Treatment context", description: "Source-backed, bounded actions. These are not pesticide prescriptions.", filters: ["crop", "evidence_status"], fields: [{ key: "disease_id", label: "Possible disease", type: "select", reference: "diseases" }, { key: "crop", label: "Crop" }, { key: "geographic_scope", label: "Geographic coverage" }, { key: "action", label: "Recommended action", type: "textarea" }, { key: "treatment_type", label: "Action type" }, { key: "requires_verified_diagnosis", label: "Requires verified diagnosis", type: "checkbox" }, { key: "source_id", label: "Source", type: "select", reference: "sources" }, { key: "evidence_status", label: "Evidence status", type: "select", options: statuses }] },
  agrovets: { label: "Agrovets", description: "One business record per name and area. Assign a registered owner; add further drug and disease pairs under Agrovet drugs. Listings are unverified.", filters: ["county", "area", "evidence_status"], fields: [{ key: "disease_id", label: "Initial disease", type: "select", reference: "diseases" }, { key: "name", label: "Business name" }, { key: "county", label: "County" }, { key: "area", label: "Area" }, { key: "address", label: "Address" }, { key: "phone_number", label: "Phone number" }, { key: "treatment_name", label: "Initial drug or service name" }, { key: "indicative_cost_kes", label: "Indicative cost (KES)" }, { key: "source_id", label: "Source", type: "select", reference: "sources" }, { key: "evidence_status", label: "Evidence status", type: "select", options: statuses }, { key: "owner_user_id", label: "Owner account", type: "select", reference: "users", optional: true }] },
  agrovet_drugs: { label: "Agrovet drugs", description: "Add a drug and its disease to an existing agrovet. These are reported listings, not approved treatments or verified stock.", filters: ["agrovet_id", "disease_id", "availability_status"], fields: [{ key: "agrovet_id", label: "Existing agrovet", type: "select", reference: "agrovets" }, { key: "disease_id", label: "Disease it is listed for", type: "select", reference: "diseases" }, { key: "drug_name", label: "Drug name" }, { key: "availability_status", label: "Reported availability", type: "select", options: ["reported_available", "reported_unavailable"] }] },
  outbreaks: { label: "Outbreak records", description: "Historical simulated records and observations awaiting expert approval—not live alerts.", filters: ["county", "area", "evidence_status", "expert_approval"], fields: [{ key: "disease_id", label: "Possible disease", type: "select", reference: "diseases" }, { key: "county", label: "County" }, { key: "area", label: "Area" }, { key: "observed_period", label: "Observed period" }, { key: "report_summary", label: "Report summary", type: "textarea" }, { key: "source_id", label: "Source", type: "select", reference: "sources" }, { key: "evidence_status", label: "Evidence status", type: "select", options: statuses }, { key: "coordinate_status", label: "Coordinate status" }, { key: "latitude", label: "Latitude", type: "number", optional: true }, { key: "longitude", label: "Longitude", type: "number", optional: true }, { key: "llm_identified", label: "AI-assisted observation", type: "checkbox" }] },
};
export const cropHealthTableLabels = Object.fromEntries(cropHealthTables.map((table) => [table, configs[table].label])) as Record<CropHealthTable, string>;
const title = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const blanks = (fields: Field[]) => Object.fromEntries(fields.map((field) => [field.key, field.type === "checkbox" ? false : ""]));
const previewColumns: Record<CropHealthTable, string[]> = {
  disease_cases: ["crop", "location_label", "season_label", "expert_approval", "identified_disease"],
  sources: ["name", "source_date", "geographic_scope", "evidence_status"],
  locations: ["county", "area", "agro_ecological_context", "evidence_status"],
  seasons: ["county", "label", "period", "source_id"],
  diseases: ["crop", "common_name", "scientific_name", "evidence_status"],
  disease_symptoms: ["disease_id", "plant_part", "symptom", "weight"],
  treatments: ["disease_id", "crop", "treatment_type", "evidence_status"],
  agrovets: ["name", "county", "area", "evidence_status"],
  agrovet_drugs: ["agrovet_id", "drug_name", "disease_id", "availability_status"],
  outbreaks: ["disease_id", "county", "observed_period", "expert_approval"],
};

export function AdminTables({ table }: { table: CropHealthTable }) {
  const config = configs[table];
  const query = useSearchParams();
  const pageSize = 15;
  const [data, setData] = useState<TableData | null>(null);
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState(query.get("filter") ?? "");
  const [filterValue, setFilterValue] = useState(query.get("value") ?? "");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => ({ ...blanks(config.fields), ...(table === "agrovet_drugs" && query.get("agrovet_id") ? { agrovet_id: query.get("agrovet_id")! } : {}) }));
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(table === "agrovet_drugs" && query.get("add") === "1");
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plantParts, setPlantParts] = useState<string[]>([]);
  const [reviewDecision, setReviewDecision] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const addForm = useRef<HTMLFormElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search.trim()) params.set("search", search.trim());
    if (filterField && filterValue) { params.set("filter_field", filterField); params.set("filter_value", filterValue); }
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/${table}?${params}`, {
        credentials: "include", cache: "no-store", signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error(typeof payload?.detail === "string" ? payload.detail : "Could not load records. Please retry.");
      if (!signal?.aborted) setData(payload);
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : "Could not load records.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [table, page, search, filterField, filterValue]);

  useEffect(() => {
    const controller = new AbortController();
    // Start after the render commits; cancel obsolete searches and filters.
    queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal); });
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (table !== "disease_symptoms") return;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/plant-parts`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setPlantParts)
      .catch(() => setLoadError("Could not load the shared plant-part list."));
  }, [table]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setFilterField(query.get("filter") ?? ""); setFilterValue(query.get("value") ?? ""); setPage(1);
      if (table === "agrovet_drugs" && query.get("add") === "1") {
        setFormOpen(true);
        setForm((current) => ({ ...current, agrovet_id: query.get("agrovet_id") ?? "" }));
      }
    });
    return () => { active = false; };
  }, [query, table]);
  useEffect(() => {
    if (formOpen) addForm.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, [formOpen]);

  const editable = config.fields.filter((field) => data?.editable_columns.includes(field.key));
  const records = data?.records ?? [];
  const filterOptions = filterField === "expert_approval" ? ["pending", "approved", "rejected"]
    : filterField === "evidence_status" ? statuses
    : [...new Set([...records.map((record) => String(record[filterField] ?? "")), filterValue].filter(Boolean))].sort();
  const shown = useMemo(() => previewColumns[table].map((key) => config.fields.find((field) => field.key === key) ?? { key, label: title(key) }), [config.fields, table]);
  const read = (record: Record<string, unknown>, field: Field) => {
    if (table === "disease_cases" && field.key === "location_label")
      return String(record.location_label || [record.area, record.county].filter(Boolean).join(", ") || "Location not recorded");
    if (table === "disease_cases" && field.key === "season_label")
      return String(record.season_label || record.season || "Season not recorded");
    const value = record[field.key];
    if (field.reference && typeof value === "number") return data?.reference_options[field.key]?.find((option) => option.id === value)?.label ?? "Unknown linked record";
    if (field.type === "checkbox") return Number(value) === 1 || value === true ? "Yes" : "No";
    return String(value ?? "—");
  };
  const edit = (record: Record<string, unknown>) => {
    setViewing(null); setEditing(record); setFormError(""); setReviewDecision(""); setReviewNote(String(record.expert_review_note ?? ""));
    setForm(Object.fromEntries(editable.map((field) => [field.key, field.type === "checkbox"
      ? Number(record[field.key]) === 1 || record[field.key] === true
      : table === "disease_cases" && field.key === "expert_approval" && record[field.key] === "pending" ? "" : String(record[field.key] ?? "")])));
  };
  const closeEdit = () => { setEditing(null); setFormError(""); setForm({ ...blanks(config.fields), ...(table === "agrovet_drugs" && query.get("agrovet_id") ? { agrovet_id: query.get("agrovet_id")! } : {}) }); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(""); setSaving(true);
    const values = Object.fromEntries(editable.map((field) => [field.key, field.type === "checkbox" ? (form[field.key] ? 1 : 0) : field.optional && form[field.key] === "" ? null : form[field.key]]));
    const endpoint = `${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/${table}${editing ? `/${editing.id}` : ""}`;
    try {
      const response = await fetch(endpoint, { method: editing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setFormError(typeof payload?.detail === "string" ? payload.detail : "Could not save this record. Check the fields and retry."); return; }
      setMessage(editing ? "Changes saved." : "Simulated record added.");
      closeEdit(); setFormOpen(false);
      await load();
    } catch { setFormError("Could not connect to the server. Please try again."); }
    finally { setSaving(false); }
  };
  const submitOutbreakReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return; setFormError(""); setSaving(true);
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/outbreaks/${editing.id}/review`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: reviewDecision, comment: reviewNote }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setFormError(typeof payload?.detail === "string" ? payload.detail : "Could not save review."); return; }
      setMessage("Outbreak review saved."); closeEdit(); await load();
    } catch { setFormError("Could not connect to the server. Please try again."); }
    finally { setSaving(false); }
  };
  const remove = async (record: Record<string, unknown>) => {
    if (!window.confirm("Delete this simulated record? This cannot be undone.")) return;
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/${table}/${record.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw Error("Could not delete record. Please retry.");
      setMessage("Record deleted.");
      if (records.length === 1 && page > 1) setPage((value) => value - 1);
      else await load();
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not delete record."); }
  };
  const filterCases = (value: string) => { setFilterField(value ? "expert_approval" : ""); setFilterValue(value); setPage(1); };
  const filtered = Boolean(search.trim() || (filterField && filterValue));

  return <div className="admin-database">
    <header className="admin-database-heading">
      <div><h1>{config.label}</h1><p>{config.description}</p></div>
      <div className="admin-heading-actions">
        {table === "agrovets" && <Link href="/disease/admin/agrovet_drugs?add=1" className="button button-primary">Add drug to existing agrovet</Link>}
        <button type="button" className="admin-icon-button" onClick={() => void load()} disabled={loading} aria-label="Refresh records" title="Refresh records"><Icon name="refresh" size={18} /></button>
        {!config.immutable && <button type="button" className="button button-primary admin-add-button" aria-expanded={formOpen} aria-controls="database-record-form" onClick={() => { setFormError(""); setFormOpen((open) => !open); }}><Icon name="plus" size={17} />{formOpen ? "Close form" : table === "agrovet_drugs" ? "Add drug listing" : table === "agrovets" ? "Add new agrovet" : "Add record"}</button>}
      </div>
    </header>
    {!config.immutable && formOpen && <section className="admin-create-panel">
      <h2>{table === "agrovet_drugs" ? "Add a drug to an existing agrovet" : `Add ${config.label.toLowerCase().replace(/s$/, "")}`}</h2>
      <form ref={addForm} id="database-record-form" onSubmit={submit} className="admin-record-form">
        {editable.map((field) => <FieldInput key={field.key} field={field.key === "plant_part" ? { ...field, options: plantParts } : field} value={form[field.key]} options={data?.reference_options[field.key]} onChange={(value) => setForm((old) => ({ ...old, [field.key]: value }))} />)}
        {formError && <p role="alert" className="error-message admin-full-width">{formError}</p>}
        <div className="admin-form-actions admin-full-width"><button disabled={saving || loading} className="button button-primary">{saving ? "Saving…" : table === "agrovet_drugs" ? "Save drug listing" : "Add simulated record"}</button><button type="button" className="button button-secondary" onClick={() => setFormOpen(false)}>Cancel</button></div>
      </form>
    </section>}
    {message && <p role="status" className="admin-feedback"><Icon name="check" size={16} />{message}</p>}
    <section className="admin-records" aria-label={`${config.label} records`} aria-busy={loading}>
      <div className="admin-records-toolbar">
        <div className="admin-records-title"><h2>{config.immutable ? "Review queue" : "Records"}</h2><span className="admin-count">{loading ? "Loading…" : `${data?.total ?? 0} ${filtered ? "matching" : "total"}`}</span></div>
        {config.immutable && <div className="admin-status-filters" aria-label="Filter by review status">{[["", "All cases"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]].map(([value, label]) => <button key={value} type="button" aria-pressed={value ? filterField === "expert_approval" && filterValue === value : !filterValue} onClick={() => filterCases(value)}>{label}</button>)}</div>}
        <div className="admin-search-row">
          <label className="admin-search"><Icon name="search" size={18} /><span className="sr-only">Search {config.label.toLowerCase()}</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search ${config.label.toLowerCase()}…`} /></label>
          {!config.immutable && (config.filters?.length ?? 0) > 0 && <label className="admin-filter"><span className="sr-only">Filter field</span><select className="field" value={filterField} onChange={(event) => { setFilterField(event.target.value); setFilterValue(""); setPage(1); }}><option value="">Filter by…</option>{config.filters?.map((field) => <option key={field} value={field}>{title(field)}</option>)}</select></label>}
          {!config.immutable && filterField && <label className="admin-filter"><span className="sr-only">Filter value</span><select className="field" value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }}><option value="">All values</option>{filterOptions.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>}
          {filtered && <button type="button" className="admin-text-button" onClick={() => { setSearch(""); filterCases(""); }}>Clear filters</button>}
        </div>
      </div>
      {loadError ? <div className="admin-empty" role="alert"><strong>Records could not be loaded</strong><p>{loadError}</p><button type="button" className="button button-secondary" onClick={() => void load()}>Retry</button></div>
        : loading ? <div className="admin-empty" role="status"><span className="admin-loading-dot" /><p>Loading {config.label.toLowerCase()}…</p></div>
        : records.length === 0 ? <div className="admin-empty"><span className="admin-empty-icon"><Icon name={filtered ? "search" : "clipboard"} size={24} /></span><h3>{filtered ? "No matching records" : "No records yet"}</h3><p>{filtered ? "Try another search or clear your filters." : config.immutable ? "Cases appear here when farmers choose Save for expert review and saving succeeds." : "Add a dated, attributed demo record to get started."}</p>{filtered && <button type="button" className="button button-secondary" onClick={() => { setSearch(""); filterCases(""); }}>Clear filters</button>}</div>
        : <div className="admin-table-container"><table className="admin-table"><caption className="sr-only">{config.label} — {data?.total} records</caption><thead><tr>{shown.map((field) => <th scope="col" key={field.key}>{field.label}</th>)}<th scope="col">Actions</th></tr></thead><tbody>{records.map((record) => <tr key={String(record.id)}>{shown.map((field) => <td key={field.key} data-label={field.label}>{field.key === "expert_approval" || field.key === "evidence_status" ? <span className="admin-status-badge" data-status={String(record[field.key])}>{title(read(record, field))}</span> : field.reference ? <Link href={`/disease/admin/${field.reference}?filter=id&value=${record[field.key]}`} className="admin-record-link">{read(record, field)}</Link> : <span>{read(record, field)}</span>}</td>)}<td data-label="Actions"><div className="admin-row-actions"><button type="button" onClick={() => setViewing(record)}>View</button>{table === "agrovets" && <Link href={`/disease/admin/agrovet_drugs?filter=agrovet_id&value=${record.id}&agrovet_id=${record.id}&add=1`}>Add drug</Link>}<button type="button" className="admin-review-button" onClick={() => edit(record)}>{config.immutable ? "Review" : "Edit"}</button>{!config.immutable && <button type="button" className="admin-delete-button" onClick={() => void remove(record)}>Delete</button>}</div></td></tr>)}</tbody></table></div>}
      <footer className="admin-pagination"><span>{data?.total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : "0 records"}</span><div><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))}</span><button type="button" disabled={loading || !data || page * pageSize >= data.total} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
    </section>
    <p className="admin-evidence-note"><Icon name="book" size={15} />Local demo evidence. Review decisions do not establish a current outbreak or an authorized treatment.</p>
    {editing && <RecordModal title={config.immutable ? "Review disease case" : `Edit ${config.label.toLowerCase()}`} onClose={closeEdit}>
      <p className="admin-modal-description">{config.immutable ? "Record a decision and explain your findings. Original case evidence is preserved." : "Update this local demo record and keep its provenance accurate."}</p>
      <form onSubmit={submit} className="admin-record-form">
        {table === "disease_cases" && <p className="admin-full-width text-sm text-slate-600">AI suggested: {String(editing.ai_disease_name || "No supported match")}. Select the reviewed disease and explain any correction. The original AI result is preserved.</p>}
        {editable.map((field) => <FieldInput key={field.key} idPrefix="edit" field={field.key === "plant_part" ? { ...field, options: plantParts } : field} value={form[field.key]} options={field.key === "reviewed_disease_id" ? data?.reference_options[field.key]?.filter((option) => option.crop?.toLowerCase() === String(editing.crop || "").toLowerCase()) : data?.reference_options[field.key]} onChange={(value) => setForm((old) => ({ ...old, [field.key]: value }))} />)}
        {formError && <p role="alert" className="error-message admin-full-width">{formError}</p>}
        <div className="admin-form-actions admin-full-width"><button disabled={saving} className="button button-primary">{saving ? "Saving…" : config.immutable ? "Save review" : "Save changes"}</button><button type="button" className="button button-secondary" onClick={closeEdit}>Cancel</button></div>
      </form>
      {table === "outbreaks" && Number(editing.llm_identified) === 1 && <form onSubmit={submitOutbreakReview} className="admin-outbreak-review">
        <h3>Expert review of AI observation</h3><p>This decision also updates the linked disease case.</p>
        <label className="field-label">Decision<select required value={reviewDecision} onChange={(event) => setReviewDecision(event.target.value)} className="field"><option value="">Choose a decision</option><option value="approved">Approve analysis</option><option value="rejected">Reject analysis</option></select></label>
        <label className="field-label">Expert review comment<textarea required value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="field" /></label>
        {formError && <p role="alert" className="error-message">{formError}</p>}<button disabled={saving} className="button button-primary">{saving ? "Saving…" : "Save review"}</button>
      </form>}
    </RecordModal>}
    {viewing && <RecordModal title={config.immutable ? "Disease case details" : `${config.label} details`} onClose={() => setViewing(null)}>
      <RecordDetails record={viewing} table={table} options={data?.reference_options ?? {}} />
      <div className="admin-form-actions admin-detail-actions">{table === "agrovets" && <Link href={`/disease/admin/agrovet_drugs?filter=agrovet_id&value=${viewing.id}&agrovet_id=${viewing.id}&add=1`} className="button button-primary">Add drug and disease</Link>}<button type="button" onClick={() => edit(viewing)} className="button button-primary">{config.immutable ? "Review case" : "Edit record"}</button><button type="button" onClick={() => setViewing(null)} className="button button-secondary">Close</button></div>
    </RecordModal>}
  </div>;
}

function FieldInput({ field, value, options, onChange, idPrefix = "add" }: {
  field: Field;
  value: string | boolean | undefined;
  options?: Option[];
  onChange: (value: string | boolean) => void;
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  return <div className={field.type === "textarea" ? "admin-full-width" : ""}>
    <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-800">{field.label}</label>
    {field.type === "textarea" ? <textarea id={id} required={!field.optional} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className="field" />
      : field.type === "checkbox" ? <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="mt-2 size-5 accent-emerald-700" />
      : field.type === "select" ? <select id={id} required={!field.optional} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className="field">
        <option value="">Choose one</option>
        {field.reference ? options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)
          : field.options?.map((option) => <option key={option} value={option}>{title(option)}</option>)}
      </select>
      : <input id={id} required={!field.optional} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} step={field.type === "number" ? "any" : undefined} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className="field" />}
  </div>;
}

function RecordDetails({ record, table, options }: { record: Record<string, unknown>; table: CropHealthTable; options: Record<string, Option[]> }) {
  const entries = Object.entries(record).filter(([key]) => key !== "id" && (!key.endsWith("_id") || Boolean(options[key])));
  return <dl className="grid gap-4 sm:grid-cols-2">{entries.map(([key, value]) => {
    const linkedTable = configs[table].fields.find((field) => field.key === key)?.reference;
    const linkedLabel = options[key]?.find((option) => option.id === value)?.label;
    let formatted = String(value ?? "—");
    if (key.endsWith("_json") && typeof value === "string") {
      try { formatted = JSON.stringify(JSON.parse(value), null, 2); } catch { /* Show the supplied text when it is not valid JSON. */ }
    }
    return <div key={key} className={key.endsWith("_json") || formatted.length > 140 ? "min-w-0 sm:col-span-2" : "min-w-0"}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title(key.replace(/_id$/, "").replace(/_json$/, ""))}</dt>
      <dd className="mt-1 break-words text-sm leading-6 text-slate-800">
        {key === "image_path" && value && (table === "disease_cases" || table === "outbreaks")
          ? <a href={`${PUBLIC_API_BASE_URL}/api/v1/admin/crop-health/${table}/${record.id}/image`} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">Open photo</a>
            : linkedTable && linkedLabel && linkedTable !== "users"
            ? <Link href={`/disease/admin/${linkedTable}?filter=id&value=${value}`} className="font-semibold text-emerald-700 underline">{linkedLabel}</Link>
            : key.endsWith("_json") && value
              ? <details className="admin-evidence-details"><summary>Inspect {title(key.replace(/_json$/, "")).toLowerCase()}</summary><pre>{formatted}</pre></details>
              : formatted}
      </dd>
    </div>;
  })}</dl>;
}
