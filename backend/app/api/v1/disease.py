from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from starlette.concurrency import run_in_threadpool

from app.data_access import disease_repository as repository
from app.models.disease import DiseaseCaseComment, DiseaseCaseCommentCreate, DiseaseCaseDetail, DiseaseCaseSummary, DiseaseRequest, DiseaseResponse, LocationOption, NearbyAgrovetsResponse, SeasonOption
from app.services.agrovet_service import find_nearby_agrovets
from app.services.accounts import current_user, optional_current_user
from app.models.user_plans import Account
from app.services import disease_case_history
from app.services.disease_engine import identify_disease

router = APIRouter(prefix="/disease", tags=["disease identification"])


@router.get("/locations", response_model=list[LocationOption])
def locations() -> list[LocationOption]:
    return [LocationOption(**row) for row in repository.list_locations()]


@router.get("/seasons/{county}", response_model=list[SeasonOption])
def seasons(county: str) -> list[SeasonOption]:
    return [SeasonOption(**row) for row in repository.list_seasons(county)]


@router.get("/nearby-agrovets", response_model=NearbyAgrovetsResponse)
def nearby_agrovets(
    county: str = Query(min_length=1),
    area: str = Query(min_length=1),
    disease_id: list[int] = Query(min_length=1),
) -> NearbyAgrovetsResponse:
    return find_nearby_agrovets(county.strip(), area.strip(), disease_id)


@router.post("/identify", response_model=DiseaseResponse)
async def identify(
    crop: Annotated[str, Form(min_length=1)],
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
    save_for_expert_review: Annotated[bool, Form()] = False,
    image: Annotated[UploadFile | None, File()] = None,
    account: Account | None = Depends(optional_current_user),
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
        save_for_expert_review=save_for_expert_review,
    )
    return await run_in_threadpool(identify_disease, request, image_bytes, image.content_type if image else None, account.id if account else None)


@router.get("/cases", response_model=list[DiseaseCaseSummary])
def cases(account: Account = Depends(current_user)) -> list[DiseaseCaseSummary]:
    return disease_case_history.list_cases(account.id)


@router.get("/cases/{case_id}", response_model=DiseaseCaseDetail)
def case(case_id: int, account: Account = Depends(current_user)) -> DiseaseCaseDetail:
    return disease_case_history.case_detail(case_id, account.id)


@router.post("/cases/{case_id}/comments", response_model=DiseaseCaseComment, status_code=201)
def add_case_comment(case_id: int, comment: DiseaseCaseCommentCreate, account: Account = Depends(current_user)) -> DiseaseCaseComment:
    return disease_case_history.add_comment(case_id, account.id, comment.body)
