from fastapi import APIRouter

from app.data_access import planting_repository as repository
from app.models.disease import LocationOption, SeasonOption
from app.models.planting import CropDetailsResponse, CropOption, PlantingRequest, PlantingResponse
from app.services.planting_agent import recommend_with_agent
from app.services.planting_details import crop_details

router = APIRouter(prefix="/planting", tags=["planting advice"])


@router.get("/locations", response_model=list[LocationOption])
def locations() -> list[LocationOption]:
    return [LocationOption(**row) for row in repository.list_locations()]


@router.get("/seasons/{county}", response_model=list[SeasonOption])
def seasons(county: str) -> list[SeasonOption]:
    return [SeasonOption(**row) for row in repository.list_seasons(county)]


@router.get("/crops", response_model=list[CropOption])
def crops() -> list[CropOption]:
    return [CropOption(**row) for row in repository.list_crops()]


@router.post("/recommend", response_model=PlantingResponse)
async def recommend(request: PlantingRequest) -> PlantingResponse:
    return await recommend_with_agent(request)


@router.get("/crops/{crop_id}/details", response_model=CropDetailsResponse)
def details(crop_id: int, county: str, area: str, season: str) -> CropDetailsResponse:
    return crop_details(crop_id, county, area, season)
