"""Farmer-visible views of consented disease cases, scoped to the submitting account."""
import json
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from app.data_access import disease_repository as repository
from app.models.disease import DiseaseCaseComment, DiseaseCaseDetail, DiseaseCaseSummary


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
    return DiseaseCaseSummary(
        id=record["id"], created_at=record["created_at"], crop=record.get("crop"),
        location_label=_location_label(record), season=record["season"], status=record["status"],
        possible_matches=matches, expert_approval=record.get("expert_approval") or "pending",
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
        **summary.model_dump(), symptoms=observation.get("symptoms"), affected_part=observation.get("affected_part"),
        spread_pattern=observation.get("spread_pattern"),
        next_actions=[str(action) for action in result.get("next_actions", []) if isinstance(action, str)], comments=comments,
    )


def add_comment(case_id: int, user_id: int, body: str) -> DiseaseCaseComment:
    comment = repository.add_case_comment(case_id, user_id, body, datetime.now(UTC).isoformat())
    if not comment:
        raise HTTPException(status_code=404, detail="Disease case not found")
    return DiseaseCaseComment(**comment)
