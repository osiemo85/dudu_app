from typing import Any
import json
from datetime import UTC, datetime

from fastapi import HTTPException

from app.data_access.database import database
from app.core.config import settings
from app.services import evidence_storage
from app.core.plant_parts import valid_plant_part


def _read_photo(reference: str) -> tuple[bytes, str]:
    try:
        return evidence_storage.read_image(reference, settings)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Review photo unavailable") from None
    except evidence_storage.EvidenceStorageError:
        raise HTTPException(status_code=503, detail="Review photo storage unavailable") from None


def case_image(case_id: int) -> tuple[bytes, str]:
    with database() as connection:
        row = connection.execute("SELECT image_path FROM disease_cases WHERE id = ?", (case_id,)).fetchone()
    if not row or not row["image_path"]:
        raise HTTPException(status_code=404, detail="No photo saved for this case")
    return _read_photo(row["image_path"])


def outbreak_image(outbreak_id: int) -> tuple[bytes, str]:
    with database() as connection:
        row = connection.execute("SELECT image_path FROM outbreaks WHERE id = ?", (outbreak_id,)).fetchone()
    if not row or not row["image_path"]:
        raise HTTPException(status_code=404, detail="No photo saved for this outbreak review")
    return _read_photo(row["image_path"])


EDITABLE_TABLES: dict[str, tuple[str, ...]] = {
    "disease_cases": ("expert_approval", "reviewed_disease_id", "expert_review_note"),
    "sources": ("name", "source_date", "geographic_scope", "evidence_status", "limitations"),
    "locations": ("county", "area", "latitude", "longitude", "agro_ecological_context", "evidence_status"),
    "seasons": ("county", "label", "period", "start_month", "end_month", "basis", "source_id"),
    "diseases": ("crop", "common_name", "scientific_name", "summary", "source_id", "evidence_status"),
    "disease_symptoms": ("disease_id", "plant_part", "symptom", "weight"),
    "treatments": ("disease_id", "crop", "geographic_scope", "action", "treatment_type", "requires_verified_diagnosis", "source_id", "evidence_status"),
    "agrovets": ("disease_id", "name", "county", "area", "address", "phone_number", "treatment_name", "indicative_cost_kes", "source_id", "evidence_status", "owner_user_id"),
    "agrovet_drugs": ("agrovet_id", "disease_id", "drug_name", "availability_status", "reported_at"),
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
    "crop-health": frozenset({"disease_cases", "sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "agrovets", "agrovet_drugs", "outbreaks"}),
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


REFERENCE_OPTIONS: dict[str, dict[str, tuple[str, str]]] = {
    "seasons": {"source_id": ("sources", "name")},
    "diseases": {"source_id": ("sources", "name")},
    "disease_symptoms": {"disease_id": ("diseases", "common_name")},
    "disease_cases": {"reviewed_disease_id": ("diseases", "common_name")},
    "treatments": {"disease_id": ("diseases", "common_name"), "source_id": ("sources", "name")},
    "agrovets": {"disease_id": ("diseases", "common_name"), "source_id": ("sources", "name"), "owner_user_id": ("users", "name")},
    "agrovet_drugs": {"agrovet_id": ("agrovets", "name"), "disease_id": ("diseases", "common_name")},
    "outbreaks": {"disease_id": ("diseases", "common_name"), "source_id": ("sources", "name")},
}


def list_records(
    table: str,
    module: str | None = None,
    *,
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    filter_field: str | None = None,
    filter_value: str | None = None,
) -> dict[str, Any]:
    if module:
        validate_module_table(module, table)
    columns = _columns(table)
    if filter_field and filter_field not in ("id", *columns):
        raise HTTPException(status_code=422, detail="That field cannot be used as a filter")
    conditions: list[str] = []
    values: list[Any] = []
    if search.strip():
        searchable = ("id", *columns)
        conditions.append("(" + " OR ".join(f"CAST({column} AS TEXT) LIKE ?" for column in searchable) + ")")
        values.extend([f"%{search.strip()}%"] * len(searchable))
    if filter_field and filter_value is not None:
        conditions.append(f"CAST({filter_field} AS TEXT) = ?")
        values.append(filter_value)
    where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    with database() as connection:
        total = connection.execute(f"SELECT COUNT(*) AS total FROM {table}{where}", values).fetchone()["total"]
        records = [dict(row) for row in connection.execute(f"SELECT * FROM {table}{where} ORDER BY id DESC LIMIT ? OFFSET ?", (*values, page_size, (page - 1) * page_size)).fetchall()]
        if table == "disease_cases":
            for record in records:
                try:
                    result = json.loads(record.get("result_json") or "{}")
                except (TypeError, ValueError):
                    result = {}
                candidates = result.get("candidates") or [] if isinstance(result, dict) else []
                first_candidate = next((item for item in candidates if isinstance(item, dict)), {}) if isinstance(candidates, list) else {}
                record["ai_disease_name"] = first_candidate.get("name")
                record["ai_disease_id"] = first_candidate.get("disease_id")
                reviewed = connection.execute(
                    "SELECT common_name FROM diseases WHERE id = ?", (record.get("reviewed_disease_id"),)
                ).fetchone() if record.get("reviewed_disease_id") else None
                record["identified_disease"] = reviewed["common_name"] if reviewed else (
                    f"AI suggestion: {record['ai_disease_name']}" if record["expert_approval"] == "pending" and record["ai_disease_name"]
                    else "No reviewed disease recorded"
                )
                comments = connection.execute(
                    "SELECT body, created_at FROM disease_case_comments WHERE disease_case_id = ? ORDER BY created_at ASC",
                    (record["id"],),
                ).fetchall()
                record["farmer_comments_json"] = json.dumps([dict(comment) for comment in comments])
        reference_options = {
            field: [dict(row) for row in connection.execute(f"SELECT id, {label} AS label FROM {reference_table} ORDER BY {label}, id").fetchall()]
            for field, (reference_table, label) in REFERENCE_OPTIONS.get(table, {}).items()
        }
        if table == "agrovet_drugs":
            reference_options["agrovet_id"] = [dict(row) for row in connection.execute(
                "SELECT id, name || ' · ' || area || ', ' || county || ' (#' || id || ')' AS label FROM agrovets ORDER BY name, county, area, id"
            ).fetchall()]
            reference_options["disease_id"] = [dict(row) for row in connection.execute(
                "SELECT id, crop || ' · ' || common_name AS label FROM diseases ORDER BY crop, common_name, id"
            ).fetchall()]
        if table == "disease_cases":
            reference_options["reviewed_disease_id"] = [dict(row) for row in connection.execute(
                "SELECT id, common_name AS label, crop FROM diseases ORDER BY crop, common_name, id"
            ).fetchall()]
    return {"table": table, "editable_columns": list(columns), "records": records, "total": total, "page": page, "page_size": page_size, "reference_options": reference_options}


def _reject_duplicate_agrovet(values: dict[str, Any], record_id: int | None = None) -> None:
    with database() as connection:
        existing_record = connection.execute("SELECT name,county,area FROM agrovets WHERE id=?", (record_id,)).fetchone() if record_id else None
        name, county, area = (str(values.get(key, existing_record[key] if existing_record else "") or "").strip()
                              for key in ("name", "county", "area"))
        if not all((name, county, area)):
            return
        existing = connection.execute(
            "SELECT id FROM agrovets WHERE lower(name)=lower(?) AND lower(county)=lower(?) AND lower(area)=lower(?) AND id<>? LIMIT 1",
            (name, county, area, record_id or -1),
        ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="This agrovet already exists. Add its next drug and disease under Agrovet drugs.")


def _validate_owner_assignment(values: dict[str, Any]) -> None:
    owner_id = values.get("owner_user_id")
    if owner_id in (None, ""):
        values["owner_user_id"] = None
        return
    with database() as connection:
        if not connection.execute("SELECT 1 FROM users WHERE id = ?", (owner_id,)).fetchone():
            raise HTTPException(status_code=422, detail="Choose an existing owner account")


def _validate_agrovet_drug(values: dict[str, Any], record_id: int | None = None) -> None:
    with database() as connection:
        existing = connection.execute("SELECT * FROM agrovet_drugs WHERE id = ?", (record_id,)).fetchone() if record_id else None
        if record_id and not existing:
            raise HTTPException(status_code=404, detail="Drug listing not found")
        shop_id = values.get("agrovet_id", existing["agrovet_id"] if existing else None)
        disease_id = values.get("disease_id", existing["disease_id"] if existing else None)
        drug_name = str(values.get("drug_name", existing["drug_name"] if existing else "") or "").strip()
        availability = values.get("availability_status", existing["availability_status"] if existing else "reported_available")
        if not drug_name:
            raise HTTPException(status_code=422, detail="Enter a drug name")
        if availability not in {"reported_available", "reported_unavailable"}:
            raise HTTPException(status_code=422, detail="Choose a valid reported availability")
        if not connection.execute("SELECT 1 FROM agrovets WHERE id = ?", (shop_id,)).fetchone():
            raise HTTPException(status_code=422, detail="Choose an existing agrovet")
        if not connection.execute("SELECT 1 FROM diseases WHERE id = ?", (disease_id,)).fetchone():
            raise HTTPException(status_code=422, detail="Choose a disease record")
        duplicate = connection.execute(
            """SELECT id FROM agrovet_drugs WHERE agrovet_id = ? AND disease_id = ?
               AND lower(drug_name) = lower(?) AND id != ? LIMIT 1""",
            (shop_id, disease_id, drug_name, record_id or -1),
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="This drug and disease are already listed for the agrovet")
    values["drug_name"] = drug_name


def create_record(table: str, values: dict[str, Any], module: str | None = None) -> dict[str, Any]:
    if module:
        validate_module_table(module, table)
    columns = _columns(table)
    if table == "disease_cases":
        raise HTTPException(status_code=405, detail="Case histories are created only by consented disease requests")
    if table == "disease_symptoms" and not valid_plant_part(values.get("plant_part")):
        raise HTTPException(status_code=422, detail="Choose a plant part from the shared list")
    if table == "agrovet_drugs":
        _validate_agrovet_drug(values)
        values["reported_at"] = datetime.now(UTC).isoformat()
    if table == "agrovets":
        _reject_duplicate_agrovet(values)
        if "owner_user_id" in values:
            _validate_owner_assignment(values)
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
    if table == "disease_symptoms" and "plant_part" in values and not valid_plant_part(values["plant_part"]):
        raise HTTPException(status_code=422, detail="Choose a plant part from the shared list")
    if table == "agrovet_drugs":
        _validate_agrovet_drug(values, record_id)
        values["reported_at"] = datetime.now(UTC).isoformat()
    if table == "agrovets":
        _reject_duplicate_agrovet(values, record_id)
        if "owner_user_id" in values:
            _validate_owner_assignment(values)
    supplied = [column for column in columns if column in values]
    if not supplied:
        raise HTTPException(status_code=422, detail="No editable values supplied")
    assignments = ", ".join(f"{column} = ?" for column in supplied)
    with database() as connection:
        if table == "disease_cases" and "expert_approval" in values:
            approval = values["expert_approval"]
            if approval not in {"pending", "approved", "rejected"}:
                raise HTTPException(status_code=422, detail="Invalid expert review status")
            if approval in {"approved", "rejected"}:
                existing = connection.execute(
                    "SELECT expert_review_note FROM disease_cases WHERE id = ?", (record_id,)
                ).fetchone()
                review_note = values.get("expert_review_note", existing["expert_review_note"] if existing else None)
                if not isinstance(review_note, str) or not review_note.strip():
                    raise HTTPException(status_code=422, detail="Add an expert review note before approving or rejecting a case")
        if table == "disease_cases":
            existing = connection.execute("SELECT crop, reviewed_disease_id, expert_approval FROM disease_cases WHERE id = ?", (record_id,)).fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Disease case not found")
            selected_id = values.get("reviewed_disease_id", existing["reviewed_disease_id"])
            approval = values.get("expert_approval", existing["expert_approval"])
            if selected_id in ("", None):
                selected_id = None
                if "reviewed_disease_id" in values:
                    values["reviewed_disease_id"] = None
            else:
                try:
                    selected_id = int(selected_id)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=422, detail="Choose a valid disease record") from None
                if "reviewed_disease_id" in values:
                    values["reviewed_disease_id"] = selected_id
                disease = connection.execute("SELECT crop FROM diseases WHERE id = ?", (selected_id,)).fetchone()
                if not disease or disease["crop"].lower() != (existing["crop"] or "").lower():
                    raise HTTPException(status_code=422, detail="Select a disease record for this case's crop")
            if approval == "approved" and selected_id is None:
                raise HTTPException(status_code=422, detail="Choose the reviewed disease before approving the case")
            if approval == "rejected" and "expert_approval" in values:
                values["reviewed_disease_id"] = None
                if "reviewed_disease_id" not in supplied:
                    supplied.append("reviewed_disease_id")
                    assignments = ", ".join(f"{column} = ?" for column in supplied)
            if "reviewed_disease_id" in values and values["reviewed_disease_id"] != existing["reviewed_disease_id"]:
                note = values.get("expert_review_note", "")
                if not isinstance(note, str) or not note.strip():
                    raise HTTPException(status_code=422, detail="Explain the disease correction in the review note")
        cursor = connection.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", (*[values[column] for column in supplied], record_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")
        if table == "disease_cases":
            connection.execute(
                """UPDATE outbreaks SET expert_approval = (SELECT expert_approval FROM disease_cases WHERE id = ?),
                   expert_review_note = (SELECT expert_review_note FROM disease_cases WHERE id = ?),
                   disease_id = COALESCE((SELECT reviewed_disease_id FROM disease_cases WHERE id = ?), disease_id)
                   WHERE id = (SELECT outbreak_id FROM disease_cases WHERE id = ?)""",
                (record_id, record_id, record_id, record_id),
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
            """UPDATE disease_cases SET expert_approval = ?, expert_review_note = ?,
               reviewed_disease_id = CASE WHEN ? = 'approved' THEN
                 (SELECT disease_id FROM outbreaks WHERE id = ?) ELSE NULL END WHERE outbreak_id = ?""",
            (decision, comment, decision, record_id, record_id),
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
