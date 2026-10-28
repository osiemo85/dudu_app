"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { DiseaseResponse, LocationOption, SeasonOption } from "@/lib/types";
import { DiseaseResult } from "./DiseaseResult";

const crops = ["Tomato", "Maize", "Bean", "Potato"];

type RequiredField = "crop" | "observation" | "location" | "season";
type ValidationErrors = Partial<Record<RequiredField, string>>;

async function responseError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body: unknown = await response.json().catch(() => null);
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      return body.detail;
    }
  }

  if (response.status === 413) return "The image must be 10 MB or smaller.";
  if (response.status === 415) return "Upload a JPEG, PNG, or WebP image.";
  return "The advisory service could not complete this request. Please try again.";
}

export function DiseaseForm() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [county, setCounty] = useState("");
  const [area, setArea] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [result, setResult] = useState<DiseaseResponse | null>(null);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [imageName, setImageName] = useState("");
  const [loading, setLoading] = useState(false);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFormOpen) return;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/locations`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setLocations)
      .catch(() => setError("Could not load demo locations. Check that FastAPI is running."));
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen || !county) return;
    fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/seasons/${encodeURIComponent(county)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setSeasons)
      .catch(() => setSeasons([]));
  }, [county, isFormOpen]);

  const counties = useMemo(() => [...new Set(locations.map((location) => location.county))], [locations]);
  const areas = locations.filter((location) => location.county === county);
  const displayedSeasons = seasons.length ? seasons : [
    { label: "Long rains", period: "local period" },
    { label: "Short rains", period: "local period" },
  ];

  useEffect(() => {
    if ((result || error) && window.matchMedia("(max-width: 1279px)").matches) {
      resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error, result]);

  function clearValidationError(field: RequiredField) {
    setValidationErrors((current) => {
      if (!current[field]) return current;
      const updated = { ...current };
      delete updated[field];
      return updated;
    });
  }

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
        setSeasons([]);
        clearValidationError("location");
        setLocationMessage("Location received. It will be saved only if you select expert review. You can use the result's correction note if the matched demo area is wrong.");
      },
      () => setLocationMessage("Location was unavailable or declined. Choose a county and area below."),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    const form = new FormData(event.currentTarget);
    const selectedCounty = String(form.get("county") ?? "").trim();
    const selectedSeason = String(form.get("season") ?? "").trim();
    const selectedCrop = String(form.get("crop") ?? "").trim();
    const symptoms = String(form.get("symptoms") ?? "").trim();
    const image = form.get("image");
    const validation: ValidationErrors = {};

    if (!selectedCrop) {
      validation.crop = "Choose the crop so the database search uses the right crop records.";
    }
    if (!symptoms && !(image instanceof File && image.size > 0)) {
      validation.observation = "Add a photo or describe the symptoms you can see.";
    }
    if (!coordinates && !selectedCounty) {
      validation.location = "Choose a county or use your location so the demo can use relevant local records.";
    }
    if (!selectedSeason) {
      validation.season = "Choose the local season or observation period.";
    }
    if (Object.keys(validation).length > 0) {
      setValidationErrors(validation);
      return;
    }

    setValidationErrors({});
    setLoading(true);
    if (!(image instanceof File) || image.size === 0) {
      form.delete("image");
    }
    if (coordinates) {
      form.set("latitude", String(coordinates.latitude));
      form.set("longitude", String(coordinates.longitude));
      form.set("location_source", "browser_location");
    } else {
      form.set("location_source", "user_selected");
    }
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/disease/identify`, { method: "POST", body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const payload: unknown = await response.json().catch(() => {
        throw new Error("The advisory service returned an unreadable response. Please try again.");
      });
      if (!payload || typeof payload !== "object") {
        throw new Error("The advisory service returned an unreadable response. Please try again.");
      }
      setResult(payload as DiseaseResponse);
    } catch (reason) {
      setError(
        reason instanceof TypeError
          ? "Could not reach the advisory service. Check that FastAPI is running, then try again."
          : reason instanceof Error
            ? reason.message
            : "The request could not be completed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {isFormOpen ? (
        <form onSubmit={submit} aria-busy={loading} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">1 · Crop observation</p>
          <h2 className="mt-2 text-2xl font-semibold text-emerald-950">What do you see?</h2>
            </div>
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close form</button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Crop <span className="text-red-700">(required)</span>
            <select name="crop" required aria-invalid={Boolean(validationErrors.crop)} aria-describedby={validationErrors.crop ? "crop-error" : undefined} className={`field mt-2 ${validationErrors.crop ? "border-red-500 bg-red-50" : ""}`} defaultValue="" onChange={() => clearValidationError("crop")}>
              <option value="">Choose crop</option>{crops.map((crop) => <option key={crop}>{crop}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">Growth stage
            <select name="growth_stage" className="field mt-2" defaultValue="">
              <option value="">Not sure</option><option>Seedling</option><option>Vegetative</option><option>Flowering</option><option>Fruiting / grain filling</option><option>Mature</option>
            </select>
          </label>
        </div>
        {validationErrors.crop && <p id="crop-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{validationErrors.crop}</p>}
        <label className="mt-5 block text-sm font-semibold text-slate-800">Symptoms <span className="font-normal text-slate-500">(or add a photo below)</span>
          <textarea name="symptoms" rows={4} aria-invalid={Boolean(validationErrors.observation)} aria-describedby={validationErrors.observation ? "observation-error" : undefined} onChange={() => clearValidationError("observation")} className={`field mt-2 ${validationErrors.observation ? "border-red-500 bg-red-50" : ""}`} placeholder="Example: Brown spots with rings on lower leaves; some leaves are yellowing." />
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Affected part
            <input name="affected_part" className="field mt-2" placeholder="Leaf, stem, fruit…" />
          </label>
          <label className="text-sm font-semibold text-slate-800">Spread pattern
            <input name="spread_pattern" className="field mt-2" placeholder="One plant, one row, rapid…" />
          </label>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-800">Crop photo <span className="font-normal text-slate-500">(or describe symptoms above)</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-invalid={Boolean(validationErrors.observation)} aria-describedby={validationErrors.observation ? "observation-error" : undefined} onChange={(event) => { setImageName(event.target.files?.[0]?.name ?? ""); clearValidationError("observation"); }} className={`mt-2 block w-full rounded-xl border border-dashed bg-emerald-50 p-4 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:font-semibold file:text-white ${validationErrors.observation ? "border-red-500 bg-red-50" : "border-emerald-300"}`} />
          <span className="mt-2 block text-xs font-normal text-slate-500">Use a clear, close photo. When OpenAI is configured, your photo and observations are sent to OpenAI for analysis. The app saves them locally only if you select expert review below.</span>
          {imageName && <span className="mt-2 block text-xs font-semibold text-emerald-800">Photo ready: {imageName}</span>}
          {validationErrors.observation && <span id="observation-error" role="alert" className="mt-2 block text-sm font-semibold text-red-700">{validationErrors.observation}</span>}
        </label>

        <div className="my-7 border-t border-slate-100" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">2 · Local context</p>
        <h2 className="mt-2 text-2xl font-semibold text-emerald-950">Where and when?</h2>
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm leading-6 text-emerald-950">Use your location to match local demo records. It is saved locally only if you select expert review below.</p>
          <button type="button" onClick={requestLocation} className="mt-3 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">Use my location</button>
          {locationMessage && <p className="mt-3 text-xs leading-5 text-emerald-800">{locationMessage}</p>}
        </div>
        <p className="my-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">or select manually</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">County <span className="text-red-700">(required unless location is used)</span>
            <select name="county" value={county} aria-invalid={Boolean(validationErrors.location)} aria-describedby={validationErrors.location ? "location-error" : undefined} onChange={(event) => { setCounty(event.target.value); setArea(""); setSeasons([]); setCoordinates(null); clearValidationError("location"); }} className={`field mt-2 ${validationErrors.location ? "border-red-500 bg-red-50" : ""}`}>
              <option value="">Choose county</option>{counties.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">Area
            <select name="area" value={area} onChange={(event) => setArea(event.target.value)} className="field mt-2" disabled={!county}>
              <option value="">Choose area</option>{areas.map((item) => <option key={item.area}>{item.area}</option>)}
            </select>
          </label>
        </div>
        {validationErrors.location && <p id="location-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{validationErrors.location}</p>}
        <label className="mt-5 block text-sm font-semibold text-slate-800">Season / observation period <span className="text-red-700">(required)</span>
          <select name="season" aria-invalid={Boolean(validationErrors.season)} aria-describedby={validationErrors.season ? "season-error" : undefined} onChange={() => clearValidationError("season")} className={`field mt-2 ${validationErrors.season ? "border-red-500 bg-red-50" : ""}`} defaultValue="">
            <option value="">Choose local season</option>{displayedSeasons.map((item) => <option key={item.label} value={item.label}>{item.label} · {item.period}</option>)}
            <option value="Dry period">Dry period / outside listed season</option>
          </select>
        </label>
        {validationErrors.season && <p id="season-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{validationErrors.season}</p>}
        <label className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <input name="save_for_expert_review" type="checkbox" className="mt-1 size-4 accent-emerald-700" />
          <span><span className="font-semibold">Save for expert review.</span> Store this observation, photo, any coordinates I supplied, AI findings, and agent run history locally for admins and officers. It stays unverified until an expert approves or rejects it.</span>
        </label>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {Object.keys(validationErrors).length > 0 && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Complete the highlighted required fields before checking possible causes.</p>}
        <button disabled={loading} className="mt-7 w-full rounded-2xl bg-emerald-700 px-5 py-3.5 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
          {loading ? <span className="flex items-center justify-center gap-3"><span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />Checking the demo evidence…</span> : "Find possible causes"}
        </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          aria-expanded="false"
          className="rounded-2xl bg-emerald-700 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Find Disease
        </button>
      )}

      <div ref={resultPanelRef} tabIndex={-1} className="scroll-mt-5 outline-none">{loading ? (
        <section aria-live="polite" aria-busy="true" className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
          <span aria-hidden="true" className="mx-auto block size-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />
          <h2 className="mt-5 text-2xl font-semibold text-emerald-950">Reviewing your observation</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">Checking matching demo records and local context.</p>
        </section>
      ) : result ? <DiseaseResult result={result} /> : isFormOpen ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
          <span className="text-5xl" aria-hidden="true">🔎</span>
          <h2 className="mt-4 text-2xl font-semibold text-emerald-950">Your possible matches will appear here</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">Possible causes, evidence, and next steps will show here.</p>
        </div>
      ) : null}</div>
    </div>
  );
}
