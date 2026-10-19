import json
from typing import Any

from app.data_access import disease_repository as repository


def lookup_disease_candidates(crop: str | None, symptoms: str, affected_part: str | None = None) -> str:
    """Find possible diseases by crop, observed symptoms, and affected plant part in the local demo tables."""
    return json.dumps(repository.search_disease_candidates(crop, symptoms, affected_part), default=str)


def lookup_local_outbreak_history(county: str, disease_ids: list[int]) -> str:
    """Find dated simulated or historical records for possible diseases in a county; never establishes a current outbreak."""
    return json.dumps(repository.get_outbreak_context(county, disease_ids), default=str)


def lookup_supported_treatments(county: str, crop: str | None, disease_ids: list[int]) -> str:
    """Find bounded treatment or next-action records with provenance and verification status."""
    return json.dumps(repository.get_treatments(county, crop, disease_ids), default=str)


TOOL_FUNCTIONS: dict[str, Any] = {
    "lookup_disease_candidates": lookup_disease_candidates,
    "lookup_local_outbreak_history": lookup_local_outbreak_history,
    "lookup_supported_treatments": lookup_supported_treatments,
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_disease_candidates",
            "description": lookup_disease_candidates.__doc__,
            "parameters": {
                "type": "object",
                "properties": {
                    "crop": {"type": ["string", "null"]},
                    "symptoms": {"type": "string"},
                    "affected_part": {"type": ["string", "null"]},
                },
                "required": ["crop", "symptoms", "affected_part"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_local_outbreak_history",
            "description": lookup_local_outbreak_history.__doc__,
            "parameters": {
                "type": "object",
                "properties": {"county": {"type": "string"}, "disease_ids": {"type": "array", "items": {"type": "integer"}}},
                "required": ["county", "disease_ids"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_supported_treatments",
            "description": lookup_supported_treatments.__doc__,
            "parameters": {
                "type": "object",
                "properties": {
                    "county": {"type": "string"},
                    "crop": {"type": ["string", "null"]},
                    "disease_ids": {"type": "array", "items": {"type": "integer"}},
                },
                "required": ["county", "crop", "disease_ids"],
                "additionalProperties": False,
            },
        },
    },
]
