import math
import re
from typing import Any

from app.data_access.database import database


def _rows(query: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with database() as connection:
        return [dict(row) for row in connection.execute(query, parameters).fetchall()]


def list_locations() -> list[dict[str, Any]]:
    return _rows("SELECT county, area, agro_ecological_context FROM locations ORDER BY county, area")


def list_seasons(county: str) -> list[dict[str, Any]]:
    return _rows("SELECT label, period FROM seasons WHERE lower(county) = lower(?) ORDER BY start_month", (county,))


def resolve_nearest_location(latitude: float, longitude: float) -> dict[str, Any] | None:
    locations = _rows("SELECT * FROM locations")
    if not locations:
        return None

    def distance(location: dict[str, Any]) -> float:
        lat1, lat2 = math.radians(latitude), math.radians(location["latitude"])
        delta_lat = lat2 - lat1
        delta_lon = math.radians(location["longitude"] - longitude)
        value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
        return 6371 * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))

    match = min(locations, key=distance)
    match["distance_km"] = round(distance(match), 1)
    return match


def find_location(county: str, area: str | None = None) -> dict[str, Any] | None:
    query = "SELECT * FROM locations WHERE lower(county) = lower(?)"
    parameters: tuple[Any, ...] = (county,)
    if area:
        query += " AND lower(area) = lower(?)"
        parameters += (area,)
    query += " ORDER BY area LIMIT 1"
    rows = _rows(query, parameters)
    return rows[0] if rows else None


def resolve_season(county: str, label: str) -> dict[str, Any] | None:
    rows = _rows(
        """
        SELECT seasons.*, sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status, sources.limitations
        FROM seasons JOIN sources ON sources.id = seasons.source_id
        WHERE lower(seasons.county) = lower(?) AND lower(seasons.label) = lower(?)
        LIMIT 1
        """,
        (county, label),
    )
    return rows[0] if rows else None


def search_disease_candidates(crop: str | None, symptoms: str, affected_part: str | None, limit: int = 3) -> list[dict[str, Any]]:
    diseases = _rows(
        """
        SELECT diseases.*, sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status source_status, sources.limitations
        FROM diseases JOIN sources ON sources.id = diseases.source_id
        WHERE (? IS NULL OR lower(diseases.crop) = lower(?))
        """,
        (crop, crop),
    )
    tokens = set(re.findall(r"[a-z]+", symptoms.lower()))
    if affected_part:
        tokens.update(re.findall(r"[a-z]+", affected_part.lower()))
    if not tokens:
        return []
    for disease in diseases:
        signals = _rows("SELECT plant_part, symptom, weight FROM disease_symptoms WHERE disease_id = ?", (disease["id"],))
        matches = []
        score = 0.0
        for signal in signals:
            signal_tokens = set(re.findall(r"[a-z]+", f'{signal["plant_part"]} {signal["symptom"]}'.lower()))
            overlap = tokens & signal_tokens
            if overlap:
                partial = len(overlap) / max(1, len(signal_tokens)) * signal["weight"]
                score += partial
                matches.append({"plant_part": signal["plant_part"], "symptom": signal["symptom"], "score": round(partial, 2)})
        disease["score"] = round(score, 2)
        disease["matches"] = matches
    ranked = sorted(diseases, key=lambda item: item["score"], reverse=True)
    positive = [item for item in ranked if item["score"] > 0]
    return positive[:limit]


def get_disease_candidates(disease_ids: list[int], symptoms: str, affected_part: str | None) -> list[dict[str, Any]]:
    if not disease_ids:
        return []
    placeholders = ",".join("?" for _ in disease_ids)
    diseases = _rows(
        f"""
        SELECT diseases.*, sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status source_status, sources.limitations
        FROM diseases JOIN sources ON sources.id = diseases.source_id
        WHERE diseases.id IN ({placeholders})
        """,
        tuple(disease_ids),
    )
    tokens = set(re.findall(r"[a-z]+", symptoms.lower()))
    if affected_part:
        tokens.update(re.findall(r"[a-z]+", affected_part.lower()))
    by_id = {row["id"]: row for row in diseases}
    for disease in diseases:
        matches = []
        score = 0.0
        for signal in _rows("SELECT plant_part, symptom, weight FROM disease_symptoms WHERE disease_id = ?", (disease["id"],)):
            signal_tokens = set(re.findall(r"[a-z]+", f'{signal["plant_part"]} {signal["symptom"]}'.lower()))
            overlap = tokens & signal_tokens
            if overlap:
                partial = len(overlap) / max(1, len(signal_tokens)) * signal["weight"]
                score += partial
                matches.append({"plant_part": signal["plant_part"], "symptom": signal["symptom"], "score": round(partial, 2)})
        disease["score"] = round(score, 2)
        disease["matches"] = matches
    return [by_id[disease_id] for disease_id in disease_ids if disease_id in by_id]


def get_outbreak_context(county: str, disease_ids: list[int]) -> list[dict[str, Any]]:
    if not disease_ids:
        return []
    placeholders = ",".join("?" for _ in disease_ids)
    return _rows(
        f"""
        SELECT outbreaks.*, diseases.common_name disease_name, sources.name source_name,
               sources.source_date, sources.geographic_scope, sources.evidence_status source_status,
               sources.limitations
        FROM outbreaks
        JOIN diseases ON diseases.id = outbreaks.disease_id
        JOIN sources ON sources.id = outbreaks.source_id
        WHERE lower(outbreaks.county) = lower(?) AND outbreaks.disease_id IN ({placeholders})
          AND (outbreaks.llm_identified = 0 OR outbreaks.expert_approval = 'approved')
        ORDER BY outbreaks.observed_period DESC
        """,
        (county, *disease_ids),
    )


def get_treatments(county: str, crop: str | None, disease_ids: list[int]) -> list[dict[str, Any]]:
    if not disease_ids:
        return []
    placeholders = ",".join("?" for _ in disease_ids)
    return _rows(
        f"""
        SELECT treatments.*, diseases.common_name disease_name, sources.name source_name,
               sources.source_date, sources.geographic_scope source_scope,
               sources.evidence_status source_status, sources.limitations
        FROM treatments
        JOIN diseases ON diseases.id = treatments.disease_id
        JOIN sources ON sources.id = treatments.source_id
        WHERE treatments.disease_id IN ({placeholders})
          AND (? IS NULL OR lower(treatments.crop) = lower(?))
        ORDER BY treatments.id
        """,
        (*disease_ids, crop, crop),
    )


def get_nearby_agrovets(county: str, area: str, disease_ids: list[int]) -> list[dict[str, Any]]:
    """Return simulated directory records matching the user's selected area and possible diseases."""
    if not disease_ids:
        return []
    placeholders = ",".join("?" for _ in disease_ids)
    return _rows(
        f"""
        SELECT agrovets.*, diseases.common_name AS disease_name,
               sources.name AS source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status AS source_status,
               sources.limitations
        FROM agrovets
        JOIN diseases ON diseases.id = agrovets.disease_id
        JOIN sources ON sources.id = agrovets.source_id
        WHERE lower(agrovets.county) = lower(?)
          AND lower(agrovets.area) = lower(?)
          AND agrovets.disease_id IN ({placeholders})
        ORDER BY agrovets.name, agrovets.treatment_name
        """,
        (county, area, *disease_ids),
    )


def get_sources(source_ids: list[int]) -> list[dict[str, Any]]:
    if not source_ids:
        return []
    placeholders = ",".join("?" for _ in source_ids)
    return _rows(f"SELECT * FROM sources WHERE id IN ({placeholders}) ORDER BY id", tuple(source_ids))


def save_disease_case(values: dict[str, Any], outbreak: dict[str, Any] | None) -> int:
    """Commit one immutable case snapshot and optional pending observation atomically."""
    with database() as connection:
        existing = connection.execute("SELECT id FROM disease_cases WHERE workflow_id = ?", (values["workflow_id"],)).fetchone()
        if existing:
            return int(existing["id"])
        outbreak_id = None
        if outbreak:
            connection.execute(
                """INSERT OR IGNORE INTO sources
                (name, source_date, geographic_scope, evidence_status, limitations)
                VALUES (?, 'ongoing', 'User-supplied location', 'awaiting_validation', ?)""",
                ("Farmer-submitted LLM observation", "Unverified observation saved for expert review; it is not an outbreak confirmation."),
            )
            source = connection.execute(
                "SELECT id FROM sources WHERE name = ? AND source_date = 'ongoing' AND geographic_scope = 'User-supplied location'",
                ("Farmer-submitted LLM observation",),
            ).fetchone()
            outbreak["source_id"] = source["id"]
            columns = list(outbreak)
            cursor = connection.execute(
                f"INSERT INTO outbreaks ({', '.join(columns)}) VALUES ({', '.join('?' for _ in columns)})",
                tuple(outbreak[column] for column in columns),
            )
            outbreak_id = cursor.lastrowid
        values = {**values, "outbreak_id": outbreak_id}
        columns = list(values)
        cursor = connection.execute(
            f"INSERT INTO disease_cases ({', '.join(columns)}) VALUES ({', '.join('?' for _ in columns)})",
            tuple(values[column] for column in columns),
        )
        return int(cursor.lastrowid)
