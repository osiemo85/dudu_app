from typing import Literal
from pydantic import BaseModel, Field, model_validator
from app.models.common import LocationContext, SeasonContext, SourceRecord, Confidence

class AnimalRequest(BaseModel):
    language: Literal['en', 'sw'] = 'en'
    species: Literal['cattle', 'goat', 'sheep', 'chicken'] | None = None
    group_name: str = Field(default='', max_length=100)
    age_group: Literal['young', 'adult', 'unknown'] = 'unknown'
    symptoms: list[Literal['cough', 'nasal_discharge', 'diarrhoea', 'poor_appetite', 'itching', 'skin_lesions', 'udder_swelling', 'milk_change']] = Field(default_factory=list, max_length=8)
    observations: str = Field(default='', max_length=3000)
    duration_days: int | None = Field(default=None, ge=0, le=3650)
    affected: int = Field(default=1, ge=1, le=1000000)
    herd_size: int = Field(default=1, ge=1, le=1000000)
    county: str | None = Field(default=None, max_length=100)
    area: str | None = Field(default=None, max_length=100)
    warning_signs: list[Literal['breathing_difficulty', 'unable_to_stand', 'sudden_deaths', 'rapid_spread']] = Field(default_factory=list, max_length=4)
    warning_check: bool = False
    vaccination: str = Field(default='', max_length=500)
    feeding_changes: str = Field(default='', max_length=500)
    introductions: str = Field(default='', max_length=500)
    photo_attached: bool = False

    @model_validator(mode='after')
    def check_counts(self):
        if self.affected > self.herd_size:
            raise ValueError('Affected animals cannot exceed the group size.')
        return self

class AnimalPossibility(BaseModel):
    id: str
    name: str
    matched_symptoms: list[str]

class AnimalResponse(BaseModel):
    status: Literal['urgent_referral', 'needs_clarification', 'possible_matches']
    urgency: Literal['contact_vet_now', 'veterinary_review_needed', 'undetermined']
    species: str | None
    possibilities: list[AnimalPossibility]
    clarification: str | None
    next_actions: list[str]
    location: LocationContext
    season: SeasonContext
    sources: list[SourceRecord]
    confidence: Confidence
    disclaimer: str
    photo_analysis: str
    review_route: Literal['veterinarian'] = 'veterinarian'

class SaveAnimalCase(BaseModel):
    observation: AnimalRequest
    consent: bool

class AnimalCase(BaseModel):
    id: int
    created_at: str
    observation: AnimalRequest
    result: AnimalResponse
