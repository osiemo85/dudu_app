from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import FileResponse

from app.models.admin import AdminRecord, AdminTable, OutbreakReview
from app.models.user_plans import Account
from app.services import admin_service
from app.services.accounts import current_admin

router = APIRouter(prefix="/admin", tags=["demo data administration"])


@router.get("/crop-health/disease_cases/{case_id}/image")
def case_image(case_id: int, _: Account = Depends(current_admin)) -> FileResponse:
    return FileResponse(admin_service.case_image(case_id), headers={"Cache-Control": "no-store"})


@router.get("/crop-health/outbreaks/{outbreak_id}/image")
def outbreak_image(outbreak_id: int, _: Account = Depends(current_admin)) -> FileResponse:
    return FileResponse(admin_service.outbreak_image(outbreak_id), headers={"Cache-Control": "no-store"})


@router.post("/crop-health/outbreaks/{outbreak_id}/review")
def review_outbreak(outbreak_id: int, review: OutbreakReview, _: Account = Depends(current_admin)) -> dict:
    return admin_service.review_outbreak(outbreak_id, review.decision, review.comment)


@router.get("/{module}/{table}", response_model=AdminTable)
def module_records(
    module: str,
    table: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=5, le=100),
    search: str = Query(default="", max_length=120),
    filter_field: str | None = Query(default=None),
    filter_value: str | None = Query(default=None, max_length=120),
    _: Account = Depends(current_admin),
) -> AdminTable:
    return AdminTable(**admin_service.list_records(table, module=module, page=page, page_size=page_size, search=search, filter_field=filter_field, filter_value=filter_value))


@router.post("/{module}/{table}")
def module_create(module: str, table: str, record: AdminRecord, _: Account = Depends(current_admin)) -> dict:
    return admin_service.create_record(table, record.values, module=module)


@router.put("/{module}/{table}/{record_id}")
def module_update(module: str, table: str, record_id: int, record: AdminRecord, _: Account = Depends(current_admin)) -> dict:
    return admin_service.update_record(table, record_id, record.values, module=module)


@router.delete("/{module}/{table}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def module_delete(module: str, table: str, record_id: int, _: Account = Depends(current_admin)) -> Response:
    admin_service.delete_record(table, record_id, module=module)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{table}", response_model=AdminTable)
def records(
    table: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=5, le=100),
    search: str = Query(default="", max_length=120),
    filter_field: str | None = Query(default=None),
    filter_value: str | None = Query(default=None, max_length=120),
    _: Account = Depends(current_admin),
) -> AdminTable:
    return AdminTable(**admin_service.list_records(table, page=page, page_size=page_size, search=search, filter_field=filter_field, filter_value=filter_value))


@router.post("/{table}")
def create(table: str, record: AdminRecord, _: Account = Depends(current_admin)) -> dict:
    return admin_service.create_record(table, record.values)


@router.put("/{table}/{record_id}")
def update(table: str, record_id: int, record: AdminRecord, _: Account = Depends(current_admin)) -> dict:
    return admin_service.update_record(table, record_id, record.values)


@router.delete("/{table}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(table: str, record_id: int, _: Account = Depends(current_admin)) -> Response:
    admin_service.delete_record(table, record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
