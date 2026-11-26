from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DrugListingInput(BaseModel):
    disease_id: int = Field(gt=0)
    drug_name: str = Field(min_length=1, max_length=160)
    availability_status: Literal["reported_available", "reported_unavailable"] = "reported_available"

    @field_validator("drug_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter a drug name")
        return value


class DrugListing(DrugListingInput):
    id: int
    agrovet_id: int
    disease_name: str
    reported_at: str


class MyAgrovet(BaseModel):
    id: int
    name: str
    county: str
    area: str
    initial_disease_name: str
    initial_treatment_name: str
    drugs: list[DrugListing]


class DiseaseOption(BaseModel):
    id: int
    crop: str
    name: str
