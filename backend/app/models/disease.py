from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.models.common import Confidence, LocationContext, SeasonContext, SourceRecord


class DiseaseRequest(BaseModel):
    crop: str = Field(min_length=1)
    growth_stage: str | None = None
    symptoms: str | None = None
    affected_part: str | None = None
    spread_pattern: str | None = None
    county: str | None = None
    area: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_source: str = "user_selected"
    season: str | None = None
    save_for_expert_review: bool = False

    @field_validator("crop")
    @classmethod
    def crop_must_be_selected(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Select the crop before analysis.")
        return value

class MatchedEvidence(BaseModel):
    observation: str
    match: str

class DiseaseCandidate(BaseModel):
    disease_id: int
    name: str
    scientific_name: str | None
    possibility: str
    summary: str
    matched_evidence: list[MatchedEvidence]


class OutbreakContext(BaseModel):
    disease: str
    area: str
    observed_period: str
    summary: str
    evidence_status: str
    current_outbreak_claimed: bool = False


class TreatmentOption(BaseModel):
    disease: str
    action: str
    treatment_type: str
    requires_verified_diagnosis: bool
    evidence_status: str
    source: SourceRecord


class NearbyAgrovet(BaseModel):
    disease_id: int
    disease: str
    name: str
    address: str
    phone_number: str
    treatment_name: str
    indicative_cost_kes: str
    evidence_status: str
    source: SourceRecord


class NearbyAgrovetsResponse(BaseModel):
    county: str
    area: str
    disease_ids: list[int]
    agrovets: list[NearbyAgrovet]
    notice: str


class Clarification(BaseModel):
    question: str
    reason: str
    field: str


class AnalysisStatus(BaseModel):
    status: Literal["not_attempted", "completed", "unavailable"] = "not_attempted"
    image_analyzed: bool = False
    message: str = "AI analysis has not been attempted; complete the required details first."
    error_code: str | None = None
    image_observations: list[str] = Field(default_factory=list)
    photo_description: str | None = None
    search_observations: list[str] = Field(default_factory=list)
    local_database_match: Literal["not_checked", "matched", "not_matched"] = "not_checked"


class AgentRun(BaseModel):
    agent_id: str
    agent_name: str
    agent_version: str = "1"
    run_id: str
    model: str
    status: Literal["completed", "failed"]
    started_at: str
    completed_at: str
    error_type: str | None = None


class OfficerReport(BaseModel):
    summary: str
    evidence_gaps: list[str]
    follow_up_questions: list[str]
    review_priority: Literal["routine", "prompt"]
    priority_reason: str


class RecordingStatus(BaseModel):
    status: Literal["not_requested", "saved", "failed"] = "not_requested"
    case_id: int | None = None
    message: str = "This observation was not saved for expert review."


class DiseaseResponse(BaseModel):
    status: str
    crop: str
    growth_stage: str | None
    location: LocationContext
    season: SeasonContext
    candidates: list[DiseaseCandidate]
    outbreak_context: list[OutbreakContext]
    treatment_options: list[TreatmentOption]
    next_actions: list[str]
    clarification: Clarification | None
    sources: list[SourceRecord]
    disclaimer: str
    confidence: Confidence
    engine: str
    analysis: AnalysisStatus = Field(default_factory=AnalysisStatus)
    workflow_id: str | None = None
    agent_runs: list[AgentRun] = Field(default_factory=list)
    officer_report: OfficerReport | None = None
    recording: RecordingStatus = Field(default_factory=RecordingStatus)


class LocationOption(BaseModel):
    county: str
    area: str
    agro_ecological_context: str


class SeasonOption(BaseModel):
    label: str
    period: str
