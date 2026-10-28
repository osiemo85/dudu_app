import type { CropDetailsResponse } from "@/lib/types";

type Plan = CropDetailsResponse["plans"][number];

function formatDay(day: number): string {
  if (day < 0) return `${Math.abs(day)} days before planting`;
  if (day === 0) return "planting day";
  return `${day} days after planting`;
}

export function PlanContent({ plan }: { plan: Plan }) {
  return <div className="space-y-4 text-sm leading-6 text-slate-700">
    <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Simulated test plan. Timing, quantities and rain needs are fictional examples, not instructions to apply. Confirm a field-specific plan with an extension officer.</p>
    {plan.overall_notes && <p>{plan.overall_notes}</p>}
    <div className="rounded-xl bg-white p-3">
      <p className="font-semibold text-slate-950">Rain and weather</p>
      <p>Rain needed: {plan.rain_needed_months == null ? "Not recorded" : `${plan.rain_needed_months} months (test value)`}.</p>
      {plan.rain_requirement_notes && <p>{plan.rain_requirement_notes}</p>}
      {plan.weather && plan.weather.rainy_months != null && plan.rain_needed_months != null && <p>Comparison: The scenario has {plan.weather.rainy_months < plan.rain_needed_months ? "fewer" : "at least as many"} rainy months as the test requirement; this does not establish whether rain arrives when needed.</p>}
      {plan.weather ? <><p>Area scenario: {plan.weather.rainy_months == null ? "Rainy months unknown" : `${plan.weather.rainy_months} rainy months`} · {plan.weather.period}. {plan.weather.rainfall_context}</p><p className="text-xs text-slate-500">{plan.weather.source.name} · {plan.weather.source.date} · {plan.weather.source.geographic_scope} · {plan.weather.source.evidence_status}. {plan.weather.source.limitations} This is not a live forecast; monthly totals do not establish rainfall timing or distribution.</p></> : <p>No area weather scenario is available.</p>}
    </div>
    <p><strong>Weeding:</strong> {plan.weeding_count == null ? "Number of rounds not recorded." : `${plan.weeding_count} test rounds; see the scheduled stages below.`}</p>
    {plan.fertility_notes && <p><strong>Fertility:</strong> {plan.fertility_notes}</p>}
    {plan.stages.length ? <ol className="space-y-3">{plan.stages.map((stage) => <li key={stage.stage_order} className="rounded-xl border border-slate-200 bg-white p-3">
      <strong>{stage.stage_name}</strong>{stage.weeding_round != null && ` · round ${stage.weeding_round}`}
      {stage.start_day_after_planting != null && <p>When: {formatDay(stage.start_day_after_planting)}{stage.end_day_after_planting != null && stage.end_day_after_planting !== stage.start_day_after_planting ? ` to ${formatDay(stage.end_day_after_planting)}` : ""} (test timing).</p>}
      {stage.start_day_after_planting == null && <p>When: Not recorded.</p>}
      {stage.duration_days != null && <p>Duration: {stage.duration_days} days.</p>}
      {stage.timing_notes && <p>{stage.timing_notes}</p>}
      {stage.description && <p>{stage.description}</p>}
      {stage.weather_rain_needs && <p>Weather: {stage.weather_rain_needs}</p>}
      {stage.activities.length > 0 && <p>Activities: {stage.activities.join("; ")}.</p>}
      {(stage.inputs ?? []).map((input, index) => <p key={`${input.name}-${index}`}><strong>Input:</strong> {input.name} ({input.category}) · {input.quantity_per_acre == null ? "quantity per acre not recorded" : `${input.quantity_per_acre} ${input.unit} per acre (test value)`}. {input.notes}</p>)}
      {(stage.treatments ?? []).map((treatment, index) => <div key={`${treatment.name}-${index}`}><p><strong>Non-chemical action:</strong> {treatment.name}. {treatment.timing_notes} {treatment.guidance}</p><p className="text-xs text-slate-500">{treatment.source.name} · {treatment.source.date} · {treatment.source.geographic_scope} · {treatment.source.evidence_status}. {treatment.source.limitations}</p></div>)}
    </li>)}</ol> : <p>No stages have been entered for this plan.</p>}
    <p>No pesticide prescription is provided. Ask a qualified extension officer or agro-dealer and follow the locally applicable product label.</p>
    <p className="text-xs text-slate-500">{plan.source.name} · {plan.source.date} · {plan.source.geographic_scope} · {plan.source.evidence_status}. {plan.source.limitations}</p>
  </div>;
}
