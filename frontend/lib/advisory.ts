import type { DiseaseResponse, SourceRecord } from "./types";
export type AdvisoryContext = {
  location: DiseaseResponse["location"];
  season: DiseaseResponse["season"];
  sources: SourceRecord[];
  disclaimer: string;
  confidence: DiseaseResponse["confidence"];
};
export type PlantingResult = AdvisoryContext & {
  status:
    | "recommendations"
    | "needs_clarification"
    | "bounded_general_guidance";
  clarification: { field: string; question: string; reason: string } | null;
  recommendations: {
    crop_id: number;
    crop: string;
    suitability: string;
    planting_window: string;
    rationale: string[];
    practical_steps: string[];
    risks_and_checks: string[];
  }[];
  evidence_gaps: string[];
  weather_context: {
    period: string;
    rainfall_context: string;
    planning_implication: string;
    evidence_status: string;
    live_forecast: boolean;
  } | null;
};
export type ChatReply = AdvisoryContext & {
  status: "general_guidance" | "needs_clarification";
  reply: string;
  action: "planting" | "disease" | "farms" | "animal-health" | null;
  engine: "scripted_local_demo";
};
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    cache: "no-store",
    ...init,
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "The service could not complete this request. Check the backend connection and try again.",
    );
  }
  return response.json() as Promise<T>;
}
