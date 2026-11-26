"""Farmer-visible views of consented disease cases, scoped to the submitting account."""
import json
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from app.data_access import disease_repository as repository
from app.data_access.database import database
from app.models.disease import AgrovetLocationOption, DiseaseCaseComment, DiseaseCaseDetail, DiseaseCaseSummary
from app.models.disease import NearbyAgrovetsResponse
from app.services.agrovet_service import find_nearby_agrovets


def _json(value: str | None) -> dict[str, Any]:
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _location_label(record: dict[str, Any]) -> str:
    return ", ".join(part for part in (record.get("area"), record.get("county")) if part) or "Location not recorded"


def _summary(record: dict[str, Any]) -> DiseaseCaseSummary:
    result = _json(record.get("result_json"))
    candidates = result.get("candidates") if isinstance(result.get("candidates"), list) else []
    matches = [str(item.get("name")) for item in candidates if isinstance(item, dict) and item.get("name")]
    reviewed_id = record.get("reviewed_disease_id")
    with database() as connection:
        reviewed = connection.execute("SELECT common_name FROM diseases WHERE id = ?", (reviewed_id,)).fetchone() if reviewed_id else None
    return DiseaseCaseSummary(
        id=record["id"], created_at=record["created_at"], crop=record.get("crop"),
        location_label=_location_label(record), season=record["season"], status=record["status"],
        possible_matches=matches, expert_approval=record.get("expert_approval") or "pending",
        reviewed_disease_id=reviewed_id, reviewed_disease_name=reviewed["common_name"] if reviewed else None,
        expert_review_note=record.get("expert_review_note"),
    )


def list_cases(user_id: int) -> list[DiseaseCaseSummary]:
    return [_summary(record) for record in repository.list_user_cases(user_id)]


def case_detail(case_id: int, user_id: int) -> DiseaseCaseDetail:
    record = repository.get_user_case(case_id, user_id)
    if not record:
        raise HTTPException(status_code=404, detail="Disease case not found")
    summary = _summary(record)
    observation = _json(record.get("observation_json"))
    result = _json(record.get("result_json"))
    comments = [DiseaseCaseComment(**comment) for comment in repository.list_case_comments(case_id, user_id)]
    return DiseaseCaseDetail(
        **summary.model_dump(), county=record.get("county"), area=record.get("area"),
        symptoms=observation.get("symptoms"), affected_part=observation.get("affected_part"),
        spread_pattern=observation.get("spread_pattern"),
        next_actions=[str(action) for action in result.get("next_actions", []) if isinstance(action, str)], comments=comments,
    )


def add_comment(case_id: int, user_id: int, body: str) -> DiseaseCaseComment:
    comment = repository.add_case_comment(case_id, user_id, body, datetime.now(UTC).isoformat())
    if not comment:
        raise HTTPException(status_code=404, detail="Disease case not found")
    return DiseaseCaseComment(**comment)


def _approved_case(case_id: int, user_id: int) -> DiseaseCaseDetail:
    case = case_detail(case_id, user_id)
    if case.expert_approval != "approved" or not case.reviewed_disease_id:
        raise HTTPException(status_code=409, detail="Expert review and a selected disease are required before this lookup.")
    return case


def agrovet_locations(case_id: int, user_id: int) -> list[AgrovetLocationOption]:
    case = _approved_case(case_id, user_id)
    return [AgrovetLocationOption(**row) for row in repository.list_agrovet_locations(case.reviewed_disease_id)]


def nearby_agrovets(case_id: int, user_id: int, county: str | None, area: str | None) -> NearbyAgrovetsResponse:
    case = _approved_case(case_id, user_id)
    if (county is None) != (area is None):
        raise HTTPException(status_code=422, detail="Choose both county and area.")
    selected_county, selected_area = (county or case.county or "").strip(), (area or case.area or "").strip()
    if not selected_county or not selected_area:
        raise HTTPException(status_code=409, detail="Choose a county and area before looking up nearby agrovets.")
    return find_nearby_agrovets(selected_county, selected_area, [case.reviewed_disease_id])
