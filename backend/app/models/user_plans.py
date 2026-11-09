from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.models.planting import CropPlan
from app.models.common import LocationContext, SeasonContext


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count('@') != 1 or any(ch.isspace() for ch in value) or not all(value.split('@')):
            raise ValueError('Enter a valid email address')
        return value


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=120)
    password_confirmation: str = Field(min_length=8, max_length=128)

    @field_validator('name')
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = ' '.join(value.split())
        if not value:
            raise ValueError('Enter your name')
        return value

    @field_validator('password_confirmation')
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        if 'password' in info.data and value != info.data['password']:
            raise ValueError('Passwords do not match')
        return value


class Account(BaseModel):
    id: int
    name: str
    email: str
    role: Literal['user', 'admin']


class SavePlanRequest(BaseModel):
    crop_id: int = Field(gt=0)
    plan_id: int = Field(gt=0)
    county: str = Field(min_length=1, max_length=100)
    area: str = Field(min_length=1, max_length=100)
    season: str = Field(min_length=1, max_length=100)


class PlanSnapshot(BaseModel):
    crop_id: int
    crop: str
    location: LocationContext
    season: SeasonContext
    plan: CropPlan
    disclaimer: str


class SavedPlan(BaseModel):
    id: int
    created_at: str
    snapshot: PlanSnapshot


class NoteCreate(BaseModel):
    category: Literal['land_preparation', 'planting', 'crop_management', 'disease', 'weather', 'harvest', 'other']
    body: str = Field(min_length=1, max_length=4000)
    observed_on: date | None = None

    @field_validator('body')
    @classmethod
    def nonempty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Enter a note')
        return value


class PlanNote(NoteCreate):
    id: int
    created_at: str


class SavedPlanDetail(SavedPlan):
    notes: list[PlanNote]
