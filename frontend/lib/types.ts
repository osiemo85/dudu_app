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
  crop: string | null;
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
  engine: string;
};

export type LocationOption = {
  county: string;
  area: string;
  agro_ecological_context: string;
};

export type SeasonOption = { label: string; period: string };

