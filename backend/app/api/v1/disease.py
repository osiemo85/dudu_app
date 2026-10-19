from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.data_access import disease_repository as repository
from app.models.disease import DiseaseRequest, DiseaseResponse, LocationOption, SeasonOption
from app.services.disease_engine import identify_disease

router = APIRouter(prefix="/disease", tags=["disease identification"])


@router.get("/locations", response_model=list[LocationOption])
def locations() -> list[LocationOption]:
    return [LocationOption(**row) for row in repository.list_locations()]


@router.get("/seasons/{county}", response_model=list[SeasonOption])
def seasons(county: str) -> list[SeasonOption]:
    return [SeasonOption(**row) for row in repository.list_seasons(county)]


@router.post("/identify", response_model=DiseaseResponse)
async def identify(
    crop: Annotated[str | None, Form()] = None,
    growth_stage: Annotated[str | None, Form()] = None,
    symptoms: Annotated[str | None, Form()] = None,
    affected_part: Annotated[str | None, Form()] = None,
    spread_pattern: Annotated[str | None, Form()] = None,
    county: Annotated[str | None, Form()] = None,
    area: Annotated[str | None, Form()] = None,
    latitude: Annotated[float | None, Form()] = None,
    longitude: Annotated[float | None, Form()] = None,
    location_source: Annotated[str, Form()] = "user_selected",
    season: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
) -> DiseaseResponse:
    if image and image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")
    image_bytes = await image.read() if image else None
    if image_bytes and len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The image must be 10 MB or smaller.")
    request = DiseaseRequest(
        crop=crop, growth_stage=growth_stage, symptoms=symptoms, affected_part=affected_part,
        spread_pattern=spread_pattern, county=county, area=area, latitude=latitude,
        longitude=longitude, location_source=location_source, season=season,
    )
    return identify_disease(request, image_bytes, image.content_type if image else None)
