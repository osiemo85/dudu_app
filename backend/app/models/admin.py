from typing import Any, Literal

from pydantic import BaseModel


class AdminRecord(BaseModel):
    values: dict[str, Any]


class AdminTable(BaseModel):
    table: str
    editable_columns: list[str]
    records: list[dict[str, Any]]
    total: int = 0
    page: int = 1
    page_size: int = 25
    reference_options: dict[str, list[dict[str, Any]]] = {}


class OutbreakReview(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str

