"use client";

import { T } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import type { LocationOption, SeasonOption } from "@/lib/types";
import { api } from "@/lib/advisory";
export type FarmContext = { county: string; area: string; season: string };
export const emptyContext: FarmContext = { county: "", area: "", season: "" };
export function ContextFields({
  value,
  onChange,
  required = false,
}: {
  value: FarmContext;
  onChange: (value: FarmContext) => void;
  required?: boolean;
}) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<LocationOption[]>("/planting/locations")
      .then((data) => {
        if (active) {
          setLocations(data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError("Demo locations could not load. Start FastAPI, then retry.");
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    let active = true;
    if (value.county)
      api<SeasonOption[]>(
        `/planting/seasons/${encodeURIComponent(value.county)}`,
      )
        .then((data) => {
          if (active) {
            setSeasons(data);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Local seasons could not load. Retry to reconnect.");
        });
    return () => {
      active = false;
    };
  }, [value.county, retry]);
  return (
    <div className="stack">
      <div className="form-grid">
        <label className="field-label"><T>County</T>{required && "(required)"}
          <select
            className="field"
            required={required}
            value={value.county}
            onChange={(e) => {
              setSeasons([]);
              onChange({ county: e.target.value, area: "", season: "" });
            }}
          >
            <option value=""><T>Choose county</T></option>
            {[...new Set(locations.map((x) => x.county))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="field-label"><T>Area</T>{required && "(required)"}
          <select
            className="field"
            required={required}
            disabled={!value.county}
            value={value.area}
            onChange={(e) => onChange({ ...value, area: e.target.value })}
          >
            <option value=""><T>Choose area</T></option>
            {locations
              .filter((x) => x.county === value.county)
              .map((x) => (
                <option key={x.area}>{x.area}</option>
              ))}
          </select>
        </label>
      </div>
      <label className="field-label"><T>Local season</T>{required && "(required)"}
        <select
          className="field"
          required={required}
          disabled={!value.county}
          value={value.season}
          onChange={(e) => onChange({ ...value, season: e.target.value })}
        >
          <option value=""><T>Choose a local season</T></option>
          {seasons.map((x) => (
            <option key={x.label} value={x.label}>
              {x.label} · {x.period}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <div className="error-message" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => setRetry((x) => x + 1)}
            className="button"
          ><T>Retry</T></button>
        </div>
      )}
      <p className="text-xs text-slate-600"><T>Manually selected demo area. No GPS is collected. Seasons come from dated local records.</T></p>
    </div>
  );
}
