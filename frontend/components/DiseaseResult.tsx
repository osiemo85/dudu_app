import type { DiseaseResponse } from "@/lib/types";
import { DisclaimerBanner } from "./DisclaimerBanner";

function EvidenceBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">{status.replaceAll("_", " ")}</span>;
}

export function DiseaseResult({ result }: { result: DiseaseResponse }) {
  if (result.clarification) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">One detail needed</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{result.clarification.question}</h2>
        <p className="mt-3 leading-7 text-slate-600">{result.clarification.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-live="polite">
      <div className="rounded-3xl bg-emerald-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Possible matches · not a diagnosis</p>
            <h2 className="mt-2 text-3xl font-semibold">{result.crop || "Crop not confirmed"}</h2>
            <p className="mt-2 text-emerald-100">{result.location.label} · {result.season.label}{result.season.period ? ` (${result.season.period})` : ""}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-200">Evidence confidence</p>
            <p className="mt-1 text-lg font-semibold capitalize">{result.confidence.level}</p>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-emerald-100">{result.confidence.explanation}</p>
        {result.location.correction_note && <p className="mt-3 rounded-xl bg-amber-300/15 p-3 text-sm text-amber-100">{result.location.correction_note}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {result.candidates.map((candidate, index) => (
          <article key={candidate.disease_id} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{index + 1}. {candidate.possibility}</p>
              <EvidenceBadge status="simulated" />
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-emerald-950">{candidate.name}</h3>
            {candidate.scientific_name && <p className="mt-1 text-sm italic text-slate-500">{candidate.scientific_name}</p>}
            <p className="mt-4 leading-7 text-slate-600">{candidate.summary}</p>
            {candidate.matched_evidence.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-800">Matched observations</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {candidate.matched_evidence.map((item) => <li key={`${item.observation}-${item.match}`}>• {item.observation} — {item.match}</li>)}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-xl font-semibold text-slate-950">Safe next steps</h3>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {result.next_actions.map((action, index) => <li key={action} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{index + 1}</span><span>{action}</span></li>)}
          </ol>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-xl font-semibold text-slate-950">Treatment context</h3>
          {result.treatment_options.length ? result.treatment_options.map((option) => (
            <div key={`${option.disease}-${option.action}`} className="mt-4 border-t border-slate-100 pt-4 first:mt-3 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-800">{option.disease}</p><EvidenceBadge status={option.evidence_status} /></div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{option.action}</p>
              <p className="mt-2 text-xs text-slate-500">Source: {option.source.name}, {option.source.date}</p>
            </div>
          )) : <p className="mt-3 text-sm leading-6 text-slate-600">No locally supported treatment record matched. Ask a qualified extension officer before choosing a crop-protection product.</p>}
        </article>
      </div>

      <article className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-slate-950">Area history</h3>
        {result.outbreak_context.length ? result.outbreak_context.map((record) => (
          <div key={`${record.disease}-${record.observed_period}`} className="mt-4 rounded-2xl bg-amber-50 p-4">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-amber-950">{record.disease} · {record.area}</p><EvidenceBadge status={record.evidence_status} /></div>
            <p className="mt-2 text-sm leading-6 text-amber-950">{record.summary}</p>
            <p className="mt-2 text-xs font-semibold text-amber-800">Historical period: {record.observed_period}. This does not indicate a current outbreak.</p>
          </div>
        )) : <p className="mt-3 text-sm leading-6 text-slate-600">No matching dated demo record was found for this area. This says nothing about current field conditions.</p>}
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-slate-950">Evidence used</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.sources.map((source) => (
            <div key={`${source.name}-${source.date}`} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{source.name}</p><EvidenceBadge status={source.evidence_status} /></div>
              <p className="mt-2 text-slate-600">{source.date} · {source.geographic_scope}</p>
              <p className="mt-2 leading-6 text-slate-500">{source.limitations}</p>
            </div>
          ))}
        </div>
      </article>
      <DisclaimerBanner text={result.disclaimer} />
    </section>
  );
}
