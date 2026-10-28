from typing import Any

from app.data_access.database import database
from app.data_access.disease_repository import (
    find_location,
    list_locations,
    list_seasons,
    resolve_nearest_location,
    resolve_season,
)


def _rows(query: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with database() as connection:
        return [dict(row) for row in connection.execute(query, parameters).fetchall()]


def list_crops() -> list[dict[str, Any]]:
    return _rows("SELECT name, summary FROM crops ORDER BY name")


def find_calendars(county: str, season: str, crop: str | None = None) -> list[dict[str, Any]]:
    return _rows(
        """
        SELECT planting_calendars.*, crops.name crop, crops.summary crop_summary,
               crops.water_requirement, crops.typical_maturity_days, crops.risk_notes,
               sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status source_status,
               sources.limitations
        FROM planting_calendars
        JOIN crops ON crops.id = planting_calendars.crop_id
        JOIN sources ON sources.id = planting_calendars.source_id
        WHERE lower(planting_calendars.county) = lower(?)
          AND lower(planting_calendars.season_label) = lower(?)
          AND (? IS NULL OR lower(crops.name) = lower(?))
        ORDER BY CASE planting_calendars.suitability
                   WHEN 'strong' THEN 1 WHEN 'conditional' THEN 2 ELSE 3 END,
                 crops.name
        """,
        (county, season, crop, crop),
    )


def get_weather(county: str, season: str) -> dict[str, Any] | None:
    rows = _rows(
        """
        SELECT weather_forecasts.*, sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status source_status,
               sources.limitations
        FROM weather_forecasts JOIN sources ON sources.id = weather_forecasts.source_id
        WHERE lower(county) = lower(?) AND lower(season_label) = lower(?)
        ORDER BY period DESC LIMIT 1
        """,
        (county, season),
    )
    return rows[0] if rows else None


def get_extension_advice(crop_id: int, county: str, season: str) -> list[dict[str, Any]]:
    return _rows(
        """
        SELECT extension_advice.*, sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status source_status,
               sources.limitations
        FROM extension_advice JOIN sources ON sources.id = extension_advice.source_id
        WHERE crop_id = ? AND lower(county) = lower(?) AND lower(season_label) = lower(?)
        """,
        (crop_id, county, season),
    )


def get_local_knowledge(crop_id: int, county: str) -> list[dict[str, Any]]:
    return _rows(
        """
        SELECT indigenous_knowledge.*, sources.name source_name, sources.source_date,
               sources.geographic_scope, sources.evidence_status source_status,
               sources.limitations
        FROM indigenous_knowledge JOIN sources ON sources.id = indigenous_knowledge.source_id
        WHERE crop_id = ? AND lower(county) = lower(?)
        """,
        (crop_id, county),
    )


def get_inputs(crop_id: int) -> list[dict[str, Any]]:
    return _rows(
        """
        SELECT input_records.*, sources.name source_name, sources.source_date,
               sources.geographic_scope source_scope, sources.evidence_status source_status,
               sources.limitations
        FROM input_records JOIN sources ON sources.id = input_records.source_id
        WHERE crop_id = ? ORDER BY input_type, name
        """,
        (crop_id,),
    )


def fetch_relevant_plants(county: str, season: str, crop: str | None = None) -> list[dict[str, Any]]:
    """First evidence tool: candidate plants from the local demo calendar."""
    return find_calendars(county, season, crop)


def fetch_plant_weather_requirements(crop_id: int, county: str, area: str, season: str) -> list[dict[str, Any]]:
    """Second evidence tool: fictional crop ranges and the matching area scenario."""
    return _rows("""
        SELECT r.*, ac.avg_rainfall_mm, ac.avg_temp_min, ac.avg_temp_max,
               ac.notes climate_notes, src.name source_name, src.source_date,
               src.geographic_scope, src.evidence_status source_status, src.limitations,
               req.name requirement_source_name, req.source_date requirement_source_date,
               req.geographic_scope requirement_source_scope, req.evidence_status requirement_source_status,
               req.limitations requirement_limitations
        FROM crop_climate_requirements r
        JOIN area_season_climate ac ON 1=1
        JOIN areas a ON a.id=ac.area_id JOIN counties c ON c.id=a.county_id
        JOIN seasons s ON s.id=ac.season_id
        JOIN sources src ON src.id=ac.source_id JOIN sources req ON req.id=r.source_id
        WHERE r.crop_id=? AND lower(c.name)=lower(?) AND lower(a.name)=lower(?)
          AND lower(s.county)=lower(c.name) AND lower(s.label)=lower(?)
    """, (crop_id, county, area, season))


def agent_area_crops(county: str, area: str, season: str) -> list[dict[str, Any]]:
    return _rows("""
        SELECT c.id crop_id, c.name crop, c.rain_needed_months, c.rain_needs_notes,
          rain.name rain_source_name, rain.source_date rain_source_date, rain.geographic_scope rain_source_scope,
          rain.evidence_status rain_source_status, rain.limitations rain_source_limitations,
          p.planting_window, p.practical_steps, p.rationale, c.risk_notes,
          src.name source_name, src.source_date, src.geographic_scope,
          src.evidence_status source_status, src.limitations
        FROM crops c LEFT JOIN sources rain ON rain.id=c.rain_needs_source_id JOIN varieties v ON v.crop_id=c.id
        JOIN area_season_varieties av ON av.variety_id=v.id AND av.is_recommended=1
        JOIN areas a ON a.id=av.area_id JOIN counties co ON co.id=a.county_id
        JOIN seasons s ON s.id=av.season_id
        JOIN planting_calendars p ON p.crop_id=c.id AND p.county=co.name AND p.season_label=s.label
        JOIN sources src ON src.id=av.source_id
        WHERE lower(co.name)=lower(?) AND lower(a.name)=lower(?) AND lower(s.county)=lower(co.name)
          AND lower(s.label)=lower(?) GROUP BY c.id ORDER BY c.name
    """, (county, area, season))


def agent_area_forecast(county: str, area: str, season: str) -> dict[str, Any] | None:
    rows = _rows("""
        SELECT w.*, src.name source_name, src.source_date, src.geographic_scope,
               src.evidence_status source_status, src.limitations
        FROM weather_forecasts w JOIN sources src ON src.id=w.source_id
        WHERE lower(w.county)=lower(?) AND lower(w.area)=lower(?) AND lower(w.season_label)=lower(?)
        ORDER BY src.source_date DESC, w.id DESC LIMIT 1
    """, (county, area, season))
    return rows[0] if rows else None


def get_crop_plans(crop_id: int, county: str, area: str, season: str) -> list[dict[str, Any]]:
    return _rows("""
        SELECT mp.id, mp.title, mp.overall_notes, mp.rain_needed_months, mp.rain_requirement_notes, mp.weeding_count, mp.fertility_notes, v.name variety, v.maturity_days,
               src.name source_name, src.source_date, src.geographic_scope,
               src.evidence_status source_status, src.limitations
        FROM management_plans mp JOIN area_season_varieties av ON av.id=mp.area_season_variety_id
        JOIN varieties v ON v.id=av.variety_id JOIN areas a ON a.id=av.area_id
        JOIN counties co ON co.id=a.county_id JOIN seasons s ON s.id=av.season_id
        LEFT JOIN sources src ON src.id=mp.source_id
        WHERE v.crop_id=? AND av.is_recommended=1 AND lower(co.name)=lower(?) AND lower(a.name)=lower(?)
          AND lower(s.county)=lower(co.name) AND lower(s.label)=lower(?) ORDER BY v.name, mp.id
    """, (crop_id, county, area, season))


def get_plan_stages(plan_id: int) -> list[dict[str, Any]]:
    return _rows("""SELECT id, stage_order,stage_name,duration_days,description,weather_rain_needs,activities,
        start_day_after_planting,end_day_after_planting,timing_notes,activity_type,weeding_round
        FROM management_stages WHERE management_plan_id=?
        ORDER BY CASE WHEN start_day_after_planting IS NULL THEN 1 ELSE 0 END, start_day_after_planting, stage_order""", (plan_id,))


def get_stage_inputs(stage_id: int) -> list[dict[str, Any]]:
    # Pesticide products and rates are excluded: this demo has no verified label source.
    return _rows("""SELECT i.name,i.category,i.unit,si.quantity_per_acre,si.notes
        FROM stage_inputs si JOIN inputs i ON i.id=si.input_id
        WHERE si.management_stage_id=? AND lower(i.category) NOT IN ('chemical','pesticide') ORDER BY i.name""", (stage_id,))


def get_stage_treatments(stage_id: int) -> list[dict[str, Any]]:
    return _rows("""SELECT t.name,t.treatment_type,t.timing_notes,t.guidance,
        s.name source_name,s.source_date,s.geographic_scope,s.evidence_status source_status,s.limitations
        FROM stage_treatments t JOIN sources s ON s.id=t.source_id
        WHERE t.management_stage_id=? AND t.treatment_type='non_chemical' ORDER BY t.name""", (stage_id,))


def get_crop_suppliers(crop_id: int, county: str, area: str, season: str) -> list[dict[str, Any]]:
    return _rows("""
        SELECT sp.name, v.name variety, sp.contact_phone, sp.contact_email, sp.description, sp.is_verified,
               sv.price, sv.unit, sv.min_order_qty, sv.notes,
               CASE WHEN sv.season_id IS NULL THEN NULL ELSE s.label END listing_season
        FROM supplier_varieties sv JOIN suppliers sp ON sp.id=sv.supplier_id
        JOIN areas a ON a.id=sp.area_id JOIN counties co ON co.id=a.county_id
        JOIN varieties v ON v.id=sv.variety_id
        JOIN area_season_varieties av ON av.variety_id=v.id AND av.area_id=a.id AND av.is_recommended=1
        JOIN seasons s ON s.id=av.season_id
        WHERE v.crop_id=? AND lower(co.name)=lower(?) AND lower(a.name)=lower(?)
          AND lower(s.county)=lower(co.name) AND lower(s.label)=lower(?)
          AND (sv.season_id IS NULL OR sv.season_id=s.id)
        ORDER BY sp.name, v.name
    """, (crop_id, county, area, season))
