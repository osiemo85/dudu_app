"use client";

import { T } from "@/components/LanguageProvider";

import { useEffect, useState, type FormEvent } from "react";
import { api, type PlantingResult } from "@/lib/advisory";
import { ContextFields, emptyContext } from "./ContextFields";
import { Evidence } from "./Evidence";
import { CropPlanPreview } from "./CropPlanPreview";
import { Icon } from "./Icon";
export function PlantingForm() {
  const [context, setContext] = useState(emptyContext);
  const [crops, setCrops] = useState<{ name: string }[]>([]);
  const [crop, setCrop] = useState("");
  const [result, setResult] = useState<PlantingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ name: string }[]>("/planting/crops")
      .then(setCrops)
      .catch(() =>
        setError(
          "Could not load crop choices. Reconnect and reload this page.",
        ),
      );
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await api<PlantingResult>("/planting/demo-recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...context,
            crop_preference: crop || null,
            irrigation: form.get("irrigation"),
          }),
        }),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace-grid">
      <form onSubmit={submit} className="panel stack" aria-busy={busy}>
        <div>
          <p className="eyebrow"><T>01 · YOUR GROWING CONTEXT</T></p>
          <h2><T>Right place. Right season.</T></h2>
        </div>
        <ContextFields
          value={context}
          onChange={(value) => {
            setContext(value);
            setResult(null);
          }}
          required
        />
        <label className="field-label"><T>Crop preference</T><select
            className="field"
            value={crop}
            onChange={(e) => {
              setCrop(e.target.value);
              setResult(null);
            }}
          >
            <option value=""><T>Explore suitable options</T></option>
            {crops.map((x) => (
              <option key={x.name}>{x.name}</option>
            ))}
          </select>
        </label>
        <label className="field-label"><T>Irrigation available</T><select
            className="field"
            name="irrigation"
            defaultValue="unknown"
            onChange={() => setResult(null)}
          >
            <option value="unknown"><T>Not sure</T></option>
            <option value="none"><T>Rainfed only</T></option>
            <option value="limited"><T>Limited irrigation</T></option>
            <option value="available"><T>Irrigation available</T></option>
          </select>
        </label>
        <p className="text-xs text-slate-600"><T>Local rule-based demo using editable sample records. No live forecast or AI ranking is used in this form.</T></p>
        <button className="button button-primary" disabled={busy}>
          <Icon name="plant" />
          {busy ? "Checking local demo evidence…" : "Explore planting options"}
        </button>
        {error && (
          <p className="error-message" role="alert">
            {error}<T>Your selections are kept; try again.</T></p>
        )}
      </form>
      <section className="stack" aria-live="polite" aria-busy={busy}>
        {busy ? (
          <div className="panel"><T>Matching your area and season with local records…</T></div>
        ) : result ? (
          <div className="panel">
            <span className="demo-tag"><T>SIMULATED ADVICE</T></span>
            {result.clarification && (
              <div className="status-message">
                <h2>{result.clarification.question}</h2>
                <p>{result.clarification.reason}</p>
                <p className="mt-2"><T>Edit your selections on this page and try again.</T></p>
              </div>
            )}
            {result.recommendations.map((item) => (
              <article key={item.crop_id} className="mt-5">
                <h2>
                  {item.crop}{" "}
                  <span className="text-sm font-normal">
                    · {item.suitability}<T>fit</T></span>
                </h2>
                <p className="status-message"><T>Planting window:</T>{item.planting_window}
                </p>
                <h3 className="font-semibold"><T>Why this option</T></h3>
                <ul className="result-list">
                  {item.rationale.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <h3 className="font-semibold mt-4"><T>Practical next steps</T></h3>
                <ol className="result-list list-decimal">
                  {item.practical_steps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
                {item.risks_and_checks.length > 0 && (
                  <>
                    <h3 className="font-semibold mt-4"><T>Check before acting</T></h3>
                    <ul className="result-list">
                      {item.risks_and_checks.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </>
                )}
                <CropPlanPreview cropId={item.crop_id} context={context} />
              </article>
            ))}
            {result.weather_context && (
              <div className="status-message">
                <strong><T>Simulated weather ·</T>{result.weather_context.period}
                </strong>
                <p>{result.weather_context.rainfall_context}</p>
                <p>{result.weather_context.planning_implication}</p>
              </div>
            )}
            {result.evidence_gaps.length > 0 && (
              <details className="mt-4">
                <summary className="py-3 cursor-pointer font-semibold"><T>Evidence gaps</T></summary>
                <ul className="result-list">
                  {result.evidence_gaps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </details>
            )}
            <Evidence result={result} />
          </div>
        ) : (
          <div className="panel">
            <span className="tool-icon green">
              <Icon name="plant" size={28} />
            </span>
            <h2><T>A plan that starts with your area.</T></h2>
            <p className="page-description"><T>Choose where and when you want to grow. We’ll show available local demo evidence, practical steps, and any missing information.</T></p>
            <div className="provenance"><T>No national calendar is assumed. Weather and input availability are simulated or unavailable.</T></div>
          </div>
        )}
      </section>
    </div>
  );
}
