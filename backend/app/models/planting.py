from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import Confidence, LocationContext, SeasonContext, SourceRecord


class PlantingRequest(BaseModel):
    crop_preference: str | None = None
    county: str | None = None
    area: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_source: str = "user_selected"
    season: str | None = None
    irrigation: Literal["none", "limited", "available", "unknown"] = "unknown"
    soil_drainage: Literal["poor", "moderate", "good", "unknown"] = "unknown"
    farm_scale: Literal["kitchen_garden", "small_plot", "commercial", "unknown"] = "unknown"
    primary_goal: Literal["household_food", "market", "both", "unknown"] = "unknown"
    risk_preference: Literal["low", "moderate", "high", "unknown"] = "unknown"


class PlantingClarification(BaseModel):
    field: str
    question: str
    reason: str


class DecisionFactor(BaseModel):
    factor: str
    finding: str
    impact: Literal["supports", "caution", "gap"]
    evidence_status: str


class InputContext(BaseModel):
    input_type: str
    name: str
    certification_status: str
    availability_status: str
    guidance: str
    evidence_status: str


class LocalKnowledgeContext(BaseModel):
    guidance: str
    community_attribution: str
    permission_status: str
    evidence_status: str


class CropRecommendation(BaseModel):
    crop_id: int
    crop: str
    suitability: Literal["strong", "conditional", "limited"]
    planting_window: str
    rationale: list[str]
    practical_steps: list[str]
    risks_and_checks: list[str]
    extension_context: list[str]
    input_context: list[InputContext]
    local_knowledge: list[LocalKnowledgeContext]


class WeatherContext(BaseModel):
    period: str
    rainfall_context: str
    planning_implication: str
    evidence_status: str
    live_forecast: bool = False


class PlantingResponse(BaseModel):
    status: Literal["recommendations", "needs_clarification", "bounded_general_guidance"]
    location: LocationContext
    season: SeasonContext
    agro_ecological_context: str | None
    requested_crop: str | None
    constraints: dict[str, str]
    recommendations: list[CropRecommendation]
    decision_factors: list[DecisionFactor]
    weather_context: WeatherContext | None
    evidence_gaps: list[str]
    review_triggers: list[str]
    clarification: PlantingClarification | None
    sources: list[SourceRecord]
    confidence: Confidence
    disclaimer: str


class CropOption(BaseModel):
    name: str
    summary: str


class PlanInput(BaseModel):
    name: str
    category: str
    quantity_per_acre: float | None
    unit: str
    notes: str | None


class PlanTreatment(BaseModel):
    name: str
    treatment_type: str
    timing_notes: str | None
    guidance: str | None
    source: SourceRecord


class PlanWeather(BaseModel):
    period: str
    rainy_months: int | None
    rainfall_context: str
    source: SourceRecord
    live_forecast: bool = False


class ManagementStage(BaseModel):
    stage_order: int
    stage_name: str
    duration_days: int | None
    description: str | None
    weather_rain_needs: str | None
    activities: list[str]
    start_day_after_planting: int | None = None
    end_day_after_planting: int | None = None
    timing_notes: str | None = None
    activity_type: str | None = None
    weeding_round: int | None = None
    inputs: list[PlanInput] = Field(default_factory=list)
    treatments: list[PlanTreatment] = Field(default_factory=list)


class CropPlan(BaseModel):
    id: int
    variety: str
    maturity_days: int | None
    title: str
    overall_notes: str | None
    rain_needed_months: int | None = None
    rain_requirement_notes: str | None = None
    weeding_count: int | None = None
    fertility_notes: str | None = None
    weather: PlanWeather | None = None
    stages: list[ManagementStage]
    source: SourceRecord


class CropSupplier(BaseModel):
    name: str
    variety: str
    contact_phone: str | None
    contact_email: str | None
    description: str | None
    listing_season: str | None
    is_verified: bool
    price: float | None
    unit: str | None
    min_order_qty: float | None
    notes: str | None


class CropDetailsResponse(BaseModel):
    crop: str
    location: LocationContext
    season: SeasonContext
    plans: list[CropPlan]
    suppliers: list[CropSupplier]
    sources: list[SourceRecord]
    disclaimer: str
