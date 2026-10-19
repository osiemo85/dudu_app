from typing import Any

from fastapi import HTTPException

from app.data_access.database import database


EDITABLE_TABLES: dict[str, tuple[str, ...]] = {
    "sources": ("name", "source_date", "geographic_scope", "evidence_status", "limitations"),
    "locations": ("county", "area", "latitude", "longitude", "agro_ecological_context", "evidence_status"),
    "seasons": ("county", "label", "period", "start_month", "end_month", "basis", "source_id"),
    "diseases": ("crop", "common_name", "scientific_name", "summary", "source_id", "evidence_status"),
    "disease_symptoms": ("disease_id", "plant_part", "symptom", "weight"),
    "treatments": ("disease_id", "crop", "geographic_scope", "action", "treatment_type", "requires_verified_diagnosis", "source_id", "evidence_status"),
    "outbreaks": ("disease_id", "county", "area", "observed_period", "report_summary", "source_id", "evidence_status", "coordinate_status"),
}


def _columns(table: str) -> tuple[str, ...]:
    columns = EDITABLE_TABLES.get(table)
    if not columns:
        raise HTTPException(status_code=404, detail="Unknown editable table")
    return columns


def list_records(table: str) -> dict[str, Any]:
    columns = _columns(table)
    with database() as connection:
        records = [dict(row) for row in connection.execute(f"SELECT * FROM {table} ORDER BY id DESC LIMIT 200").fetchall()]
    return {"table": table, "editable_columns": list(columns), "records": records}


def create_record(table: str, values: dict[str, Any]) -> dict[str, Any]:
    columns = _columns(table)
    supplied = [column for column in columns if column in values]
    if not supplied:
        raise HTTPException(status_code=422, detail="No editable values supplied")
    placeholders = ", ".join("?" for _ in supplied)
    with database() as connection:
        cursor = connection.execute(f"INSERT INTO {table} ({', '.join(supplied)}) VALUES ({placeholders})", tuple(values[column] for column in supplied))
        record = connection.execute(f"SELECT * FROM {table} WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(record)


def update_record(table: str, record_id: int, values: dict[str, Any]) -> dict[str, Any]:
    columns = _columns(table)
    supplied = [column for column in columns if column in values]
    if not supplied:
        raise HTTPException(status_code=422, detail="No editable values supplied")
    assignments = ", ".join(f"{column} = ?" for column in supplied)
    with database() as connection:
        cursor = connection.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", (*[values[column] for column in supplied], record_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")
        record = connection.execute(f"SELECT * FROM {table} WHERE id = ?", (record_id,)).fetchone()
    return dict(record)


def delete_record(table: str, record_id: int) -> None:
    _columns(table)
    with database() as connection:
        try:
            cursor = connection.execute(f"DELETE FROM {table} WHERE id = ?", (record_id,))
        except Exception as exc:
            raise HTTPException(status_code=409, detail="Record is referenced by other demo data") from exc
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")
