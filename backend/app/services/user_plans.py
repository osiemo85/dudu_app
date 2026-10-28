"""Persist user-owned plan snapshots and dated observations."""
import json
from datetime import UTC, datetime

from fastapi import HTTPException

from app.data_access.database import database
from app.models.user_plans import NoteCreate, PlanNote, PlanSnapshot, SavePlanRequest, SavedPlan, SavedPlanDetail
from app.services.planting_details import crop_details


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _saved(row) -> SavedPlan:
    return SavedPlan(id=row['id'], created_at=row['created_at'], snapshot=PlanSnapshot.model_validate_json(row['snapshot_json']))


def save(user_id: int, request: SavePlanRequest) -> SavedPlan:
    details = crop_details(request.crop_id, request.county, request.area, request.season)
    plan = next((item for item in details.plans if item.id == request.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail='No matching plan for this crop, area and season.')
    snapshot = PlanSnapshot(crop_id=request.crop_id, crop=details.crop, location=details.location,
                            season=details.season, plan=plan, disclaimer=details.disclaimer)
    with database() as connection:
        cursor = connection.execute('INSERT INTO saved_plans(user_id,created_at,snapshot_json) VALUES (?,?,?)',
                                    (user_id, _now(), snapshot.model_dump_json()))
        row = connection.execute('SELECT id,created_at,snapshot_json FROM saved_plans WHERE id=?', (cursor.lastrowid,)).fetchone()
    return _saved(row)


def list_plans(user_id: int) -> list[SavedPlan]:
    with database() as connection:
        rows = connection.execute('SELECT id,created_at,snapshot_json FROM saved_plans WHERE user_id=? ORDER BY created_at DESC,id DESC', (user_id,)).fetchall()
    return [_saved(row) for row in rows]


def detail(user_id: int, plan_id: int) -> SavedPlanDetail:
    with database() as connection:
        row = connection.execute('SELECT id,created_at,snapshot_json FROM saved_plans WHERE id=? AND user_id=?', (plan_id, user_id)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail='Saved plan not found.')
        notes = connection.execute('SELECT id,category,body,observed_on,created_at FROM plan_notes WHERE saved_plan_id=? ORDER BY created_at DESC,id DESC', (plan_id,)).fetchall()
    return SavedPlanDetail(**_saved(row).model_dump(), notes=[PlanNote(**dict(note)) for note in notes])


def add_note(user_id: int, plan_id: int, note: NoteCreate) -> PlanNote:
    with database() as connection:
        if not connection.execute('SELECT 1 FROM saved_plans WHERE id=? AND user_id=?', (plan_id, user_id)).fetchone():
            raise HTTPException(status_code=404, detail='Saved plan not found.')
        cursor = connection.execute('INSERT INTO plan_notes(saved_plan_id,category,body,observed_on,created_at) VALUES (?,?,?,?,?)',
            (plan_id, note.category, note.body, note.observed_on.isoformat() if note.observed_on else None, _now()))
        row = connection.execute('SELECT id,category,body,observed_on,created_at FROM plan_notes WHERE id=?', (cursor.lastrowid,)).fetchone()
    return PlanNote(**dict(row))
