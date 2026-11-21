"use client";
import { T } from "@/components/LanguageProvider";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/advisory";
import type { FarmContext } from "./ContextFields";
import type { SourceRecord } from "@/lib/types";
export type ManagementPlan = {
  id: number;
  variety: string;
  title: string;
  overall_notes: string | null;
  source: SourceRecord;
  rain_needed_months?: number | null;
  rain_requirement_notes?: string | null;
  weeding_count?: number | null;
  fertility_notes?: string | null;
  weather?: {
    period: string;
    rainy_months: number | null;
    rainfall_context: string;
    source: SourceRecord;
  } | null;
  stages: {
    stage_order: number;
    stage_name: string;
    duration_days: number | null;
    description: string | null;
    activities: string[];
    weather_rain_needs: string | null;
    start_day_after_planting?: number | null;
    end_day_after_planting?: number | null;
    timing_notes?: string | null;
    inputs?: {
      name: string;
      quantity_per_acre: number | null;
      unit: string;
      notes: string | null;
    }[];
    treatments?: {
      name: string;
      guidance: string | null;
      source: SourceRecord;
    }[];
  }[];
};
export function PlanStages({ plan }: { plan: ManagementPlan }) {
  return (
    <div>
      <h3 className="font-semibold">
        {plan.title} · {plan.variety}
      </h3>
      <p className="text-sm text-slate-600 mt-2">{plan.overall_notes}</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer py-3 font-semibold">
          Demo rain, weeding & fertility context
        </summary>
        <p>
          Rain needs: {plan.rain_needed_months ?? "unknown"} months.{" "}
          {plan.rain_requirement_notes}
        </p>
        <p>
          Weeding rounds: {plan.weeding_count ?? "unknown"}.{" "}
          {plan.fertility_notes}
        </p>
        {plan.weather && (
          <p className="mt-2">
            Simulated weather ({plan.weather.period}):{" "}
            {plan.weather.rainy_months ?? "unknown"} rainy months.{" "}
            {plan.weather.rainfall_context} Source: {plan.weather.source.name},{" "}
            {plan.weather.source.date}, {plan.weather.source.geographic_scope},{" "}
            {plan.weather.source.evidence_status}.{" "}
            {plan.weather.source.limitations}
          </p>
        )}
        <p className="mt-2">
          Fictional test values only. Rainy-month totals do not establish
          rainfall distribution. Review timings and quantities locally before
          any use.
        </p>
      </details>
      <ol className="result-list list-decimal mt-3">
        {plan.stages.map((stage) => (
          <li key={stage.stage_order} className="mb-3">
            <strong>{stage.stage_name}</strong>
            {stage.duration_days && (
              <span> · {stage.duration_days} days (demo)</span>
            )}
            <p>{stage.description}</p>
            {(stage.start_day_after_planting != null ||
              stage.end_day_after_planting != null) && (
              <p>
                Demo timing: day {stage.start_day_after_planting ?? "unknown"}–
                {stage.end_day_after_planting ?? "unknown"} after planting.
              </p>
            )}
            {stage.timing_notes && <p>{stage.timing_notes}</p>}
            {!!stage.inputs?.length && (
              <details>
                <summary className="py-3 cursor-pointer">
                  Simulated inputs for this stage
                </summary>
                {stage.inputs.map((input, i) => (
                  <p key={i}>
                    {input.name}: {input.quantity_per_acre ?? "unspecified"}{" "}
                    {input.unit} per acre (fictional demo). {input.notes}
                  </p>
                ))}
              </details>
            )}
            {stage.treatments?.map((action, i) => (
              <p key={i}>
                {action.name}: {action.guidance} Source: {action.source.name},{" "}
                {action.source.date}, {action.source.geographic_scope},{" "}
                {action.source.evidence_status}.
              </p>
            ))}
            {stage.activities.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
            {stage.weather_rain_needs && (
              <p>Weather needs: {stage.weather_rain_needs}</p>
            )}
          </li>
        ))}
      </ol>
      <p className="provenance">
        {plan.source.name} · {plan.source.date} · {plan.source.geographic_scope}{" "}
        · {plan.source.evidence_status}. {plan.source.limitations}
      </p>
    </div>
  );
}
export function CropPlanPreview({
  cropId,
  context,
}: {
  cropId: number;
  context: FarmContext;
}) {
  const [details, setDetails] = useState<{
    plans: ManagementPlan[];
    disclaimer: string;
    suppliers: {
      name: string;
      variety: string;
      description: string | null;
      contact_phone: string | null;
      contact_email: string | null;
    }[];
    sources: SourceRecord[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setDetails(
        await api(
          `/planting/crops/${cropId}/details?${new URLSearchParams(context)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function save(id: number) {
    setBusy(true);
    setError("");
    try {
      await api("/saved-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop_id: cropId, plan_id: id, ...context }),
      });
      setSaved("Plan snapshot saved to your account.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        className="button button-secondary"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy
          ? "Loading…"
          : details
            ? "Refresh growing plans"
            : "View growing plans"}
      </button>
      {details && (
        <div className="stack mt-4">
          {details.plans.length ? (
            details.plans.map((plan) => (
              <div className="panel" key={plan.id}>
                <PlanStages plan={plan} />
                <button
                  type="button"
                  className="button button-primary mt-4"
                  disabled={busy}
                  onClick={() => void save(plan.id)}
                ><T>Save plan to my account</T></button>
                <p className="text-xs text-slate-600 mt-2">
                  Sign in to save a snapshot. Demo plans require local review.
                </p>
              </div>
            ))
          ) : (
            <p>
              No growing plan matches this crop, area, and season in the demo
              records.
            </p>
          )}
          <details className="panel">
            <summary className="cursor-pointer py-3 font-semibold">
              Simulated supplier listings ({details.suppliers.length})
            </summary>
            <p className="text-xs text-slate-600 mb-3">
              Fictional local listings only. Business contacts, prices and stock
              are not verified. Do not treat these examples as real suppliers.
            </p>
            {details.suppliers.length ? (
              details.suppliers.map((supplier, i) => (
                <div key={i} className="provenance">
                  <strong>
                    {supplier.name} · {supplier.variety}
                  </strong>
                  <p>{supplier.description}</p>
                  {supplier.contact_phone && (
                    <p>Demo phone: {supplier.contact_phone}</p>
                  )}
                  {supplier.contact_email && (
                    <p>Demo email: {supplier.contact_email}</p>
                  )}
                </div>
              ))
            ) : (
              <p>No matching local supplier listing is available.</p>
            )}
            {details.sources.map((source, i) => (
              <p className="provenance" key={i}>
                {source.name} · {source.date} · {source.geographic_scope} ·{" "}
                {source.evidence_status}. {source.limitations}
              </p>
            ))}
          </details>
          <p className="text-xs text-slate-600">{details.disclaimer}</p>
        </div>
      )}
      {saved && (
        <p role="status" className="status-message">
          {saved}{" "}
          <Link href="/planting/plans" className="underline">
            View saved plans
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="error-message mt-3">
          {error}{" "}
          <Link className="underline" href="/account/login">
            Sign in
          </Link>{" "}
          if your session has ended, then try again.
        </p>
      )}
    </div>
  );
}
