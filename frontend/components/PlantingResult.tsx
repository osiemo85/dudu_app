import type { PlantingResponse } from "@/lib/types";
import { CropDetails } from "./CropDetails";
import { DisclaimerBanner } from "./DisclaimerBanner";

export function PlantingResult({ result }: { result: PlantingResponse }) {
  if (result.clarification) {
    return <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm" aria-live="polite">
      <h2 className="text-2xl font-semibold text-slate-950">{result.clarification.question}</h2>
      <p className="mt-3 leading-7 text-slate-600">{result.clarification.reason}</p>
      <p className="mt-4 text-sm text-slate-500">{result.location.label} · {result.season.label}</p>
      <div className="mt-5"><DisclaimerBanner text={result.disclaimer} /></div>
    </section>;
  }
  return <section className="space-y-5" aria-live="polite">
    <div className="rounded-3xl bg-emerald-950 p-6 text-white">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Simulated planting advice</p>
      <h2 className="mt-2 text-2xl font-semibold">{result.location.label}</h2>
      <p className="mt-2 text-emerald-100">{result.season.label} · {result.season.period}</p>
      {result.location.correction_note && <p className="mt-3 text-sm text-amber-100">{result.location.correction_note}</p>}
    </div>
    {result.recommendations.map((crop) => <article key={crop.crop_id} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-semibold text-emerald-950">{crop.crop}</h3><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{crop.suitability === "strong" ? "Highly recommended" : crop.suitability === "conditional" ? "Recommended with caution" : "Not recommended"}</span></div>
      {crop.rationale.map((line) => <p key={line} className="mt-3 text-sm leading-6 text-slate-600">{line}</p>)}
      <p className="mt-4 text-sm text-slate-700"><strong>Planting window:</strong> {crop.planting_window}</p>
      {crop.practical_steps.length > 0 && <p className="mt-3 text-sm leading-6 text-slate-700"><strong>Next steps:</strong> {crop.practical_steps.join("; ")}.</p>}
      {result.location.county && result.location.area && <CropDetails key={`${crop.crop_id}-${result.location.county}-${result.location.area}-${result.season.label}`} cropId={crop.crop_id} county={result.location.county} area={result.location.area} season={result.season.label} />}
    </article>)}
    {result.weather_context && <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Weather: {result.weather_context.period} · {result.weather_context.rainfall_context} This is simulated, not a live forecast.</p>}
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><summary className="cursor-pointer font-semibold">Evidence and limitations</summary>{result.sources.map((source) => <p key={`${source.name}-${source.date}`} className="mt-3">{source.name} · {source.date} · {source.geographic_scope} · {source.evidence_status}. {source.limitations}</p>)}</details>
    <DisclaimerBanner text={result.disclaimer} />
  </section>;
}
