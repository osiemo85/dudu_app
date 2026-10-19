"use client";

import { useEffect, useMemo, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { DiseaseResponse, LocationOption, SeasonOption } from "@/lib/types";
import { DiseaseResult } from "./DiseaseResult";

const crops = ["Tomato", "Maize", "Bean", "Potato"];

export function DiseaseForm() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [county, setCounty] = useState("");
  const [area, setArea] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [result, setResult] = useState<DiseaseResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/locations`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setLocations)
      .catch(() => setError("Could not load demo locations. Check that FastAPI is running."));
  }, []);

  useEffect(() => {
    if (!county) { setSeasons([]); return; }
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/seasons/${encodeURIComponent(county)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setSeasons)
      .catch(() => setSeasons([]));
  }, [county]);

  const counties = useMemo(() => [...new Set(locations.map((location) => location.county))], [locations]);
  const areas = locations.filter((location) => location.county === county);
  const displayedSeasons = seasons.length ? seasons : [
    { label: "Long rains", period: "local period" },
    { label: "Short rains", period: "local period" },
  ];

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("This browser does not provide location. Choose a county and area below.");
      return;
    }
    setLocationMessage("Waiting for browser permission…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setCounty("");
        setArea("");
        setLocationMessage("Location received for this request only. You can use the result's correction note if the matched demo area is wrong.");
      },
      () => setLocationMessage("Location was unavailable or declined. Choose a county and area below."),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const form = new FormData(event.currentTarget);
    if (coordinates) {
      form.set("latitude", String(coordinates.latitude));
      form.set("longitude", String(coordinates.longitude));
      form.set("location_source", "browser_location");
    } else {
      form.set("location_source", "user_selected");
    }
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/identify`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The request could not be completed.");
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <form onSubmit={submit} className="h-fit rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">1 · Crop observation</p>
          <h2 className="mt-2 text-2xl font-semibold text-emerald-950">What do you see?</h2>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Crop
            <select name="crop" className="field mt-2" defaultValue="">
              <option value="">Not sure</option>{crops.map((crop) => <option key={crop}>{crop}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">Growth stage
            <select name="growth_stage" className="field mt-2" defaultValue="">
              <option value="">Not sure</option><option>Seedling</option><option>Vegetative</option><option>Flowering</option><option>Fruiting / grain filling</option><option>Mature</option>
            </select>
          </label>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-800">Symptoms
          <textarea name="symptoms" rows={4} className="field mt-2" placeholder="Example: Brown spots with rings on lower leaves; some leaves are yellowing." />
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Affected part
            <input name="affected_part" className="field mt-2" placeholder="Leaf, stem, fruit…" />
          </label>
          <label className="text-sm font-semibold text-slate-800">Spread pattern
            <input name="spread_pattern" className="field mt-2" placeholder="One plant, one row, rapid…" />
          </label>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-800">Crop photo
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-2 block w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:font-semibold file:text-white" />
          <span className="mt-2 block text-xs font-normal text-slate-500">Use a clear, close photo in good light. The image is sent for this analysis and is not stored by the demo.</span>
        </label>

        <div className="my-7 border-t border-slate-100" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">2 · Local context</p>
        <h2 className="mt-2 text-2xl font-semibold text-emerald-950">Where and when?</h2>
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm leading-6 text-emerald-950">Your approximate position helps match county-level demo records. It is used for this request only and is not saved.</p>
          <button type="button" onClick={requestLocation} className="mt-3 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">Use my location</button>
          {locationMessage && <p className="mt-3 text-xs leading-5 text-emerald-800">{locationMessage}</p>}
        </div>
        <p className="my-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">or select manually</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">County
            <select name="county" value={county} onChange={(event) => { setCounty(event.target.value); setArea(""); setCoordinates(null); }} className="field mt-2">
              <option value="">Choose county</option>{counties.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">Area
            <select name="area" value={area} onChange={(event) => setArea(event.target.value)} className="field mt-2" disabled={!county}>
              <option value="">Choose area</option>{areas.map((item) => <option key={item.area}>{item.area}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-800">Season / observation period
          <select name="season" className="field mt-2" defaultValue="">
            <option value="">Choose local season</option>{displayedSeasons.map((item) => <option key={item.label} value={item.label}>{item.label} · {item.period}</option>)}
            <option value="Dry period">Dry period / outside listed season</option>
          </select>
        </label>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button disabled={loading} className="mt-7 w-full rounded-2xl bg-emerald-700 px-5 py-3.5 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
          {loading ? "Checking the demo evidence…" : "Find possible causes"}
        </button>
      </form>

      <div>{result ? <DiseaseResult result={result} /> : (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center xl:sticky xl:top-6">
          <span className="text-5xl" aria-hidden="true">🔎</span>
          <h2 className="mt-4 text-2xl font-semibold text-emerald-950">Your possible matches will appear here</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">The demo compares your observation with editable local tables, then shows evidence, uncertainty, historical area context, and safe next steps.</p>
        </div>
      )}</div>
    </div>
  );
}
