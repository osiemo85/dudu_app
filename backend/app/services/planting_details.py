"""Read area-specific plan and supplier demo records for a selected crop."""
import json

from fastapi import HTTPException

from app.core.disclaimers import PLANTING_DISCLAIMER
from app.data_access import planting_repository as repository
from app.data_access.database import database
from app.models.planting import CropDetailsResponse, CropPlan, CropSupplier, ManagementStage, PlantingRequest
from app.services.context import resolve_context
from app.services.planting_engine import _source


def crop_details(crop_id: int, county: str, area: str, season_label: str) -> CropDetailsResponse:
    request = PlantingRequest(county=county, area=area, season=season_label)
    location, season, location_record, season_record = resolve_context(request)
    if not location_record or not season_record:
        raise HTTPException(status_code=404, detail="No matching demo area and season.")
    with database() as connection:
        crop = connection.execute("SELECT name FROM crops WHERE id=?", (crop_id,)).fetchone()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found.")
    plans = []
    sources = {_source(season_record).name: _source(season_record)}
    for row in repository.get_crop_plans(crop_id, location.county, location.area, season.label):
        stages = []
        for stage in repository.get_plan_stages(row["id"]):
            raw = stage.pop("activities")
            try:
                decoded = json.loads(raw) if raw else []
                activities = decoded if isinstance(decoded, list) and all(isinstance(x, str) for x in decoded) else [raw]
            except (ValueError, TypeError):
                activities = [raw] if raw else []
            stages.append(ManagementStage(**stage, activities=activities))
        # Only source-attributed plans can be shown as advisory records.
        if not row["source_name"]:
            continue
        source = _source(row)
        sources[source.name + source.date] = source
        plans.append(CropPlan(variety=row["variety"], maturity_days=row["maturity_days"], title=row["title"],
                              overall_notes=row["overall_notes"], stages=stages, source=source))
    suppliers = [CropSupplier(**row) for row in repository.get_crop_suppliers(crop_id, location.county, location.area, season.label)]
    return CropDetailsResponse(crop=crop["name"], location=location, season=season, plans=plans,
                               suppliers=suppliers, sources=list(sources.values()), disclaimer=PLANTING_DISCLAIMER)
