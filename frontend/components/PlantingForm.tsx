"use client";

import { useEffect, useMemo, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { LocationOption, PlantingResponse, SeasonOption } from "@/lib/types";
import { PlantingResult } from "./PlantingResult";

export function PlantingForm() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [county, setCounty] = useState("");
  const [area, setArea] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [result, setResult] = useState<PlantingResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/planting/locations`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((rows: LocationOption[]) => { if (active) setLocations(rows); })
      .catch(() => { if (active) setError("Could not load locations. Check that FastAPI is running."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!county) return;
    let active = true;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/planting/seasons/${encodeURIComponent(county)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((rows: SeasonOption[]) => { if (active) setSeasons(rows); })
      .catch(() => { if (active) setError("Could not load local seasons."); });
    return () => { active = false; };
  }, [county]);

  const counties = useMemo(() => [...new Set(locations.map((location) => location.county))], [locations]);
  const areas = locations.filter((location) => location.county === county);
  const displayedSeasons = seasons;

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("This browser does not provide location. Choose a county and area below.");
      return;
    }
    setLocationMessage("Waiting for browser permission…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        try {
          const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/planting/recommend`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...point, location_source: "browser_location" }),
          });
          if (!response.ok) throw new Error("Location lookup failed");
          const body: PlantingResponse = await response.json();
          if (!body.location.county || !body.location.area || body.clarification?.field === "manual_location") {
            setCoordinates(null); setCounty(""); setArea("");
            setLocationMessage("No nearby demo area could be matched. Choose a county and area below.");
            return;
          }
          setCoordinates(point); setCounty(body.location.county); setArea(body.location.area);
          setLocationMessage(`Matched ${body.location.area}, ${body.location.county}. Please check this area and correct it below if needed.`);
        } catch {
          setCoordinates(null);
          setLocationMessage("Location lookup failed. Choose a county and area below.");
        }
      },
      () => setLocationMessage("Location was unavailable or declined. Choose a county and area below."),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      ...values,
      county: coordinates ? null : values.county || null,
      area: coordinates ? null : values.area || null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      location_source: coordinates ? "browser_location" : "user_selected",
      season: values.season || null,
    };
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/planting/recommend`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "The request could not be completed.");
      setResult(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be completed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <form onSubmit={submit} className="h-fit rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">1 · Planning context</p>
        <h2 className="mt-2 text-2xl font-semibold text-emerald-950">Where and when will you plant?</h2>
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm leading-6 text-emerald-950">Use your location to match a demo area. It is used once and not stored.</p>
          <button type="button" onClick={requestLocation} className="mt-3 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">Use my location</button>
          {locationMessage && <p className="mt-3 text-xs leading-5 text-emerald-800">{locationMessage}</p>}
        </div>
        <p className="my-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">or select manually</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">County
            <select name="county" value={county} onChange={(event) => { setCounty(event.target.value); setArea(""); setSeasons([]); setCoordinates(null); }} className="field mt-2">
              <option value="">Choose county</option>{counties.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">Area
            <select name="area" value={area} onChange={(event) => { setArea(event.target.value); setCoordinates(null); }} className="field mt-2" disabled={!county}>
              <option value="">Choose area</option>{areas.map((item) => <option key={item.area}>{item.area}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-800">Intended season
          <select key={county} name="season" className="field mt-2" defaultValue="" disabled={!county}>
            <option value="">Choose local season (select location first)</option>{displayedSeasons.map((item) => <option key={item.label} value={item.label}>{item.label} · {item.period}</option>)}
          </select>
        </label>

        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button disabled={loading} className="mt-7 w-full rounded-2xl bg-emerald-700 px-5 py-3.5 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
          {loading ? "Checking crops and weather…" : "Find crops"}
        </button>
      </form>
      <div>{result ? <PlantingResult result={result} /> : (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center xl:sticky xl:top-6">
          <span className="text-5xl" aria-hidden="true">🌾</span><h2 className="mt-4 text-2xl font-semibold text-emerald-950">Your planning review will appear here</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">Crop options, planting windows, and next steps will show here.</p>
        </div>
      )}</div>
    </div>
  );
}
