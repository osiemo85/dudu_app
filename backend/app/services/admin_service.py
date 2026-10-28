from typing import Any
from pathlib import Path

from fastapi import HTTPException

from app.data_access.database import database
from app.core.config import settings


def case_image(case_id: int) -> Path:
    with database() as connection:
        row = connection.execute("SELECT image_path FROM disease_cases WHERE id = ?", (case_id,)).fetchone()
    if not row or not row["image_path"]:
        raise HTTPException(status_code=404, detail="No photo saved for this case")
    path = Path(row["image_path"]).resolve()
    if not path.is_relative_to(settings.outbreak_evidence_dir.resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="Case photo unavailable")
    return path


def outbreak_image(outbreak_id: int) -> Path:
    with database() as connection:
        row = connection.execute("SELECT image_path FROM outbreaks WHERE id = ?", (outbreak_id,)).fetchone()
    if not row or not row["image_path"]:
        raise HTTPException(status_code=404, detail="No photo saved for this outbreak review")
    path = Path(row["image_path"]).resolve()
    if not path.is_relative_to(settings.outbreak_evidence_dir.resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="Outbreak review photo unavailable")
    return path


EDITABLE_TABLES: dict[str, tuple[str, ...]] = {
    "disease_cases": ("expert_approval", "expert_review_note"),
    "sources": ("name", "source_date", "geographic_scope", "evidence_status", "limitations"),
    "locations": ("county", "area", "latitude", "longitude", "agro_ecological_context", "evidence_status"),
    "seasons": ("county", "label", "period", "start_month", "end_month", "basis", "source_id"),
    "diseases": ("crop", "common_name", "scientific_name", "summary", "source_id", "evidence_status"),
    "disease_symptoms": ("disease_id", "plant_part", "symptom", "weight"),
    "treatments": ("disease_id", "crop", "geographic_scope", "action", "treatment_type", "requires_verified_diagnosis", "source_id", "evidence_status"),
    "agrovets": ("disease_id", "name", "county", "area", "address", "phone_number", "treatment_name", "indicative_cost_kes", "source_id", "evidence_status"),
    "outbreaks": ("disease_id", "county", "area", "observed_period", "report_summary", "source_id", "evidence_status", "coordinate_status", "latitude", "longitude", "llm_identified"),
    "crops": ("name", "summary", "water_requirement", "typical_maturity_days", "risk_notes", "rain_needed_months", "rain_needs_notes", "rain_needs_source_id", "source_id", "evidence_status"),
    "counties": ("name",),
    "areas": ("county_id", "name", "latitude", "longitude"),
    "varieties": ("crop_id", "name", "maturity_days", "yield_potential", "description"),
    "area_season_varieties": ("area_id", "season_id", "variety_id", "is_recommended", "notes", "source_id"),
    "management_plans": ("area_season_variety_id", "title", "overall_notes", "source_id", "rain_needed_months", "rain_requirement_notes", "weeding_count", "fertility_notes"),
    "management_stages": ("management_plan_id", "stage_order", "stage_name", "duration_days", "description", "weather_rain_needs", "activities", "start_day_after_planting", "end_day_after_planting", "timing_notes", "activity_type", "weeding_round"),
    "inputs": ("name", "unit", "category"),
    "stage_inputs": ("management_stage_id", "input_id", "quantity_per_acre", "notes"),
    "stage_treatments": ("management_stage_id", "treatment_type", "name", "timing_notes", "guidance", "source_id"),
    "suppliers": ("name", "contact_phone", "contact_email", "area_id", "latitude", "longitude", "description", "is_verified"),
    "supplier_varieties": ("supplier_id", "variety_id", "season_id", "price", "unit", "min_order_qty", "notes"),
    "area_season_climate": ("area_id", "season_id", "avg_rainfall_mm", "avg_temp_min", "avg_temp_max", "humidity_pct", "notes", "data_source", "source_id"),
    "planting_calendars": ("crop_id", "county", "season_label", "planting_window", "suitability", "rationale", "practical_steps", "source_id", "evidence_status"),
    "weather_forecasts": ("county", "area", "season_label", "period", "rainy_months", "rainfall_context", "planning_implication", "source_id", "evidence_status"),
    "extension_advice": ("crop_id", "county", "season_label", "advice", "source_id", "evidence_status"),
    "indigenous_knowledge": ("crop_id", "county", "guidance", "community_attribution", "permission_status", "source_id", "evidence_status"),
    "input_records": ("crop_id", "input_type", "name", "geographic_scope", "certification_status", "availability_status", "guidance", "source_id", "evidence_status"),
}

MODULE_TABLES: dict[str, frozenset[str]] = {
    "crop-health": frozenset({"disease_cases", "sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "agrovets", "outbreaks"}),
    "planting": frozenset({"sources", "locations", "counties", "areas", "seasons", "crops", "varieties", "area_season_varieties", "management_plans", "management_stages", "inputs", "stage_inputs", "stage_treatments", "suppliers", "supplier_varieties", "area_season_climate", "planting_calendars", "weather_forecasts", "extension_advice", "indigenous_knowledge", "input_records"}),
}


def _columns(table: str) -> tuple[str, ...]:
    columns = EDITABLE_TABLES.get(table)
    if not columns:
        raise HTTPException(status_code=404, detail="Unknown editable table")
    return columns


def validate_module_table(module: str, table: str) -> None:
    if module not in MODULE_TABLES:
        raise HTTPException(status_code=404, detail="Unknown dashboard module")
    if table not in MODULE_TABLES[module]:
        raise HTTPException(status_code=404, detail="This table does not belong to the selected dashboard")


def list_records(table: str, module: str | None = None) -> dict[str, Any]:
    if module:
        validate_module_table(module, table)
    columns = _columns(table)
    with database() as connection:
        records = [dict(row) for row in connection.execute(f"SELECT * FROM {table} ORDER BY id DESC LIMIT 200").fetchall()]
    return {"table": table, "editable_columns": list(columns), "records": records}


def create_record(table: str, values: dict[str, Any], module: str | None = None) -> dict[str, Any]:
    if module:
        validate_module_table(module, table)
    columns = _columns(table)
    if table == "disease_cases":
        raise HTTPException(status_code=405, detail="Case histories are created only by consented disease requests")
    supplied = [column for column in columns if column in values]
    if not supplied:
        raise HTTPException(status_code=422, detail="No editable values supplied")
    placeholders = ", ".join("?" for _ in supplied)
    with database() as connection:
        cursor = connection.execute(f"INSERT INTO {table} ({', '.join(supplied)}) VALUES ({placeholders})", tuple(values[column] for column in supplied))
        record = connection.execute(f"SELECT * FROM {table} WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(record)


def update_record(table: str, record_id: int, values: dict[str, Any], module: str | None = None) -> dict[str, Any]:
    if module:
        validate_module_table(module, table)
    columns = _columns(table)
    supplied = [column for column in columns if column in values]
    if not supplied:
        raise HTTPException(status_code=422, detail="No editable values supplied")
    if table == "disease_cases" and "expert_approval" in values and values["expert_approval"] not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Invalid expert review status")
    assignments = ", ".join(f"{column} = ?" for column in supplied)
    with database() as connection:
        cursor = connection.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", (*[values[column] for column in supplied], record_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")
        if table == "disease_cases":
            connection.execute(
                """UPDATE outbreaks SET expert_approval = (SELECT expert_approval FROM disease_cases WHERE id = ?),
                   expert_review_note = (SELECT expert_review_note FROM disease_cases WHERE id = ?)
                   WHERE id = (SELECT outbreak_id FROM disease_cases WHERE id = ?)""",
                (record_id, record_id, record_id),
            )
        record = connection.execute(f"SELECT * FROM {table} WHERE id = ?", (record_id,)).fetchone()
    return dict(record)


def review_outbreak(record_id: int, decision: str, comment: str) -> dict[str, Any]:
    comment = comment.strip()
    if decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Choose approve or reject")
    if not comment:
        raise HTTPException(status_code=422, detail="Add an expert review comment before deciding")
    with database() as connection:
        cursor = connection.execute(
            "UPDATE outbreaks SET expert_approval = ?, expert_review_note = ? WHERE id = ? AND llm_identified = 1",
            (decision, comment, record_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Pending AI outbreak review not found")
        connection.execute(
            "UPDATE disease_cases SET expert_approval = ?, expert_review_note = ? WHERE outbreak_id = ?",
            (decision, comment, record_id),
        )
        record = connection.execute("SELECT * FROM outbreaks WHERE id = ?", (record_id,)).fetchone()
    return dict(record)


def delete_record(table: str, record_id: int, module: str | None = None) -> None:
    if module:
        validate_module_table(module, table)
    _columns(table)
    if table == "disease_cases":
        raise HTTPException(status_code=405, detail="Case history cannot be deleted through generic table editing")
    with database() as connection:
        try:
            cursor = connection.execute(f"DELETE FROM {table} WHERE id = ?", (record_id,))
        except Exception as exc:
            raise HTTPException(status_code=409, detail="Record is referenced by other demo data") from exc
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")
