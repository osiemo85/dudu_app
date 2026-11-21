from typing import Literal
from pydantic import BaseModel, Field, field_validator
from app.models.common import LocationContext, SeasonContext, SourceRecord, Confidence

class ChatRequest(BaseModel):
    language: Literal["en", "sw"] = "en"
    subject: Literal["crops", "animals"] = "crops"
    message: str = Field(min_length=1, max_length=2000)
    county: str | None = Field(default=None, max_length=100)
    area: str | None = Field(default=None, max_length=100)
    season: str | None = Field(default=None, max_length=100)

    @field_validator("message")
    @classmethod
    def nonempty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter a farming question.")
        return value.strip()

class ChatResponse(BaseModel):
    status: Literal["general_guidance", "needs_clarification"]
    reply: str
    action: Literal["disease", "planting", "farms", "animal-health"] | None
    location: LocationContext
    season: SeasonContext
    sources: list[SourceRecord]
    confidence: Confidence
    disclaimer: str
    engine: Literal["scripted_local_demo"] = "scripted_local_demo"
