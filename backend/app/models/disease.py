from pydantic import BaseModel, Field

from app.models.common import Confidence, LocationContext, SeasonContext, SourceRecord


class DiseaseRequest(BaseModel):
    crop: str | None = None
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


class Clarification(BaseModel):
    question: str
    reason: str
    field: str


class DiseaseResponse(BaseModel):
    status: str
    crop: str | None
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


class LocationOption(BaseModel):
    county: str
    area: str
    agro_ecological_context: str


class SeasonOption(BaseModel):
    label: str
    period: str

