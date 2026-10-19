from fastapi import APIRouter, Response, status

from app.models.admin import AdminRecord, AdminTable
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["demo data administration"])


@router.get("/{table}", response_model=AdminTable)
def records(table: str) -> AdminTable:
    return AdminTable(**admin_service.list_records(table))


@router.post("/{table}")
def create(table: str, record: AdminRecord) -> dict:
    return admin_service.create_record(table, record.values)


@router.put("/{table}/{record_id}")
def update(table: str, record_id: int, record: AdminRecord) -> dict:
    return admin_service.update_record(table, record_id, record.values)


@router.delete("/{table}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(table: str, record_id: int) -> Response:
    admin_service.delete_record(table, record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
