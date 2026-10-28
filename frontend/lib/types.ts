export type EvidenceStatus = "simulated" | "manually_supplied" | "awaiting_validation" | "verified";

export type SourceRecord = {
  name: string;
  date: string;
  geographic_scope: string;
  evidence_status: EvidenceStatus;
  limitations: string;
};

export type DiseaseResponse = {
  status: "possible_matches" | "needs_clarification";
  crop: string;
  growth_stage: string | null;
  location: {
    label: string;
    county: string | null;
    area: string | null;
    coordinates: null;
    source: "user_selected" | "browser_location" | "unknown";
    correction_note: string | null;
  };
  season: { label: string; period: string | null; basis: string };
  candidates: Array<{
    disease_id: number;
    name: string;
    scientific_name: string | null;
    possibility: string;
    summary: string;
    matched_evidence: Array<{ observation: string; match: string }>;
  }>;
  outbreak_context: Array<{
    disease: string;
    area: string;
    observed_period: string;
    summary: string;
    evidence_status: string;
    current_outbreak_claimed: false;
  }>;
  treatment_options: Array<{
    disease: string;
    action: string;
    treatment_type: string;
    requires_verified_diagnosis: boolean;
    evidence_status: string;
    source: SourceRecord;
  }>;
  next_actions: string[];
  clarification: { question: string; reason: string; field: string } | null;
  sources: SourceRecord[];
  disclaimer: string;
  confidence: { level: "low" | "medium" | "high"; explanation: string };
  workflow_id: string | null;
  agent_runs: Array<{
    agent_id: string; agent_name: string; agent_version: string; run_id: string;
    model: string; status: "completed" | "failed"; started_at: string; completed_at: string;
    error_type: string | null;
  }>;
  officer_report: {
    summary: string; evidence_gaps: string[]; follow_up_questions: string[];
    review_priority: "routine" | "prompt"; priority_reason: string;
  } | null;
  recording: { status: "not_requested" | "saved" | "failed"; case_id: number | null; message: string };
  engine: string;
  analysis: {
    status: "not_attempted" | "completed" | "unavailable";
    error_code: string | null;
    image_analyzed: boolean;
    image_observations: string[];
    photo_description: string | null;
    search_observations: string[];
    local_database_match: "not_checked" | "matched" | "not_matched";
    message: string;
  };
};

export type NearbyAgrovetsResponse = {
  county: string;
  area: string;
  disease_ids: number[];
  notice: string;
  agrovets: Array<{
    disease_id: number;
    disease: string;
    name: string;
    address: string;
    phone_number: string;
    treatment_name: string;
    indicative_cost_kes: string;
    evidence_status: string;
    source: SourceRecord;
  }>;
};

export type LocationOption = {
  county: string;
  area: string;
  agro_ecological_context: string;
};

export type SeasonOption = { label: string; period: string };

export type CropOption = { name: string; summary: string };

export type PlantingResponse = {
  status: "recommendations" | "needs_clarification" | "bounded_general_guidance";
  location: DiseaseResponse["location"];
  season: DiseaseResponse["season"];
  agro_ecological_context: string | null;
  requested_crop: string | null;
  constraints: Record<string, string>;
  recommendations: Array<{
    crop_id: number;
    crop: string;
    suitability: "strong" | "conditional" | "limited";
    planting_window: string;
    rationale: string[];
    practical_steps: string[];
    risks_and_checks: string[];
    extension_context: string[];
    input_context: Array<{
      input_type: string;
      name: string;
      certification_status: string;
      availability_status: string;
      guidance: string;
      evidence_status: string;
    }>;
    local_knowledge: Array<{
      guidance: string;
      community_attribution: string;
      permission_status: string;
      evidence_status: string;
    }>;
  }>;
  decision_factors: Array<{
    factor: string;
    finding: string;
    impact: "supports" | "caution" | "gap";
    evidence_status: string;
  }>;
  weather_context: {
    period: string;
    rainfall_context: string;
    planning_implication: string;
    evidence_status: string;
    live_forecast: false;
  } | null;
  evidence_gaps: string[];
  review_triggers: string[];
  clarification: { field: string; question: string; reason: string } | null;
  sources: SourceRecord[];
  confidence: { level: "low" | "medium" | "high"; explanation: string };
  disclaimer: string;
};


export type CropDetailsResponse = {
  crop: string;
  location: DiseaseResponse["location"];
  season: DiseaseResponse["season"];
  plans: Array<{
    id: number;
    variety: string;
    maturity_days: number | null;
    title: string;
    overall_notes: string | null;
    rain_needed_months: number | null;
    rain_requirement_notes: string | null;
    weeding_count: number | null;
    fertility_notes: string | null;
    weather: { period: string; rainy_months: number | null; rainfall_context: string; source: SourceRecord; live_forecast: false } | null;
    source: SourceRecord;
    stages: Array<{
      stage_order: number;
      stage_name: string;
      duration_days: number | null;
      description: string | null;
      weather_rain_needs: string | null;
      activities: string[];
      start_day_after_planting: number | null;
      end_day_after_planting: number | null;
      timing_notes: string | null;
      activity_type: string | null;
      weeding_round: number | null;
      inputs: Array<{ name: string; category: string; quantity_per_acre: number | null; unit: string; notes: string | null }>;
      treatments: Array<{ name: string; treatment_type: string; timing_notes: string | null; guidance: string | null; source: SourceRecord }>;
    }>;
  }>;
  suppliers: Array<{
    name: string;
    variety: string;
    contact_phone: string | null;
    contact_email: string | null;
    description: string | null;
    listing_season: string | null;
    is_verified: boolean;
    price: number | null;
    unit: string | null;
    min_order_qty: number | null;
    notes: string | null;
  }>;
  sources: SourceRecord[];
  disclaimer: string;
};

export type SavedPlan = {
  id: number;
  created_at: string;
  snapshot: {
    crop_id: number;
    crop: string;
    location: DiseaseResponse["location"];
    season: DiseaseResponse["season"];
    plan: CropDetailsResponse["plans"][number];
    disclaimer: string;
  };
};
export type SavedPlanDetail = SavedPlan & {
  notes: Array<{ id: number; category: string; body: string; observed_on: string | null; created_at: string }>;
};
