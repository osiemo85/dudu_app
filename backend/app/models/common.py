from typing import Literal

from pydantic import BaseModel


EvidenceStatus = Literal["simulated", "manually_supplied", "awaiting_validation", "verified"]


class LocationContext(BaseModel):
    label: str
    county: str | None
    area: str | None
    coordinates: None = None
    source: Literal["user_selected", "browser_location", "unknown"]
    correction_note: str | None = None


class SeasonContext(BaseModel):
    label: str
    period: str | None
    basis: str


class SourceRecord(BaseModel):
    name: str
    date: str
    geographic_scope: str
    evidence_status: EvidenceStatus
    limitations: str


class Confidence(BaseModel):
    level: Literal["low", "medium", "high"]
    explanation: str

