"use client";

import { useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import type { CropDetailsResponse } from "@/lib/types";
import { PlanContent } from "./PlanContent";
import { SavePlanButton } from "./SavePlanButton";

type Props = { cropId: number; county: string; area: string; season: string };

export function CropDetails({ cropId, county, area, season }: Props) {
  const [data, setData] = useState<CropDetailsResponse | null>(null);
  const [view, setView] = useState<"plan" | "suppliers" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function open(next: "plan" | "suppliers") {
    if (view === next) { setView(null); return; }
    setView(next);
    if (data) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ county, area, season });
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/planting/crops/${cropId}/details?${params}`);
      if (!response.ok) throw new Error("Could not load these demo records. Please try again.");
      setData(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load these demo records.");
    } finally { setLoading(false); }
  }

  return <div className="mt-5 border-t border-slate-100 pt-5">
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => open("plan")} aria-expanded={view === "plan"} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Planting plan</button>
      <button type="button" onClick={() => open("suppliers")} aria-expanded={view === "suppliers"} className="rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Find agrovets</button>
    </div>
    {view && <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700" aria-live="polite">
      {loading && <p>Loading demo records…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => { setView(null); setError(""); }} className="font-semibold underline">Close</button></p>}
      {!loading && data && view === "plan" && <div>
        <h4 className="font-semibold text-slate-950">Planting plans · {data.location.label} · {data.season.label}</h4>
        <p className="mt-2 text-amber-800">Simulated test plans; confirm all steps with a local extension officer.</p>
        {data.plans.length === 0 && <p className="mt-3">No sourced planting plan is available for this crop, area and season.</p>}
        {data.plans.map((plan, index) => <div key={`${plan.variety}-${index}`} className="mt-4 border-t border-slate-200 pt-4">
          <p className="font-semibold">{plan.variety}{plan.maturity_days ? ` · ${plan.maturity_days} days to maturity` : " · maturity unknown"}</p>
          <div className="mt-3"><PlanContent plan={plan} /></div>
          <SavePlanButton cropId={cropId} planId={plan.id} county={county} area={area} season={season} />
        </div>)}
      </div>}
      {!loading && data && view === "suppliers" && <div>
        <h4 className="font-semibold text-slate-950">Agrovets · {data.location.label} · {data.season.label}</h4>
        <p className="mt-2 text-amber-800">Local demo listings; record dates are unknown. Supplier details, stock and prices are not verified or current. Seeded phone numbers and email addresses are invalid test placeholders.</p>
        {data.suppliers.length === 0 && <p className="mt-3">No agrovet listings are available for this crop, area and season.</p>}
        {[...new Set(data.suppliers.map((supplier) => supplier.name))].map((name) => {
          const listings = data.suppliers.filter((supplier) => supplier.name === name);
          const supplier = listings[0];
          return <article key={name} className="mt-4 border-t border-slate-200 pt-4">
            <h5 className="font-semibold text-slate-950">{name}</h5>
            <p className="mt-2">Phone: {supplier.contact_phone || "Not provided"}</p>
            <p className="mt-1">Email: {supplier.contact_email || "Not provided"}</p>
            {supplier.description && <p className="mt-1">{supplier.description}</p>}
            <p className="mt-1 text-slate-500">Verification: {supplier.is_verified ? "Marked verified in the local record; not independently checked" : "Not verified"}.</p>
            <div className="mt-3 space-y-3">{listings.map((listing, index) => <div key={`${listing.variety}-${listing.listing_season ?? "any"}-${index}`} className="rounded-xl bg-white p-3">
              <p className="font-semibold">Variety: {listing.variety}</p>
              <p className="mt-1">Season: {listing.listing_season ?? "Not specified"}</p>
              <p className="mt-1">Price: {listing.price === null ? "Unknown" : `${listing.price}${listing.unit ? ` per ${listing.unit}` : " (unit not specified)"} (currency not recorded)`}</p>
              <p className="mt-1">Minimum order: {listing.min_order_qty === null ? "Unknown" : `${listing.min_order_qty}${listing.unit ? ` ${listing.unit}` : " (unit not specified)"}`}</p>
              <p className="mt-1">Stock: Unknown</p>
              {listing.notes && <p className="mt-1 text-slate-500">{listing.notes}</p>}
            </div>)}</div>
          </article>;
        })}
      </div>}
    </div>}
  </div>;
}
