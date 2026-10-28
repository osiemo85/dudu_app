from typing import Any, Literal

from pydantic import BaseModel


class AdminRecord(BaseModel):
    values: dict[str, Any]


class AdminTable(BaseModel):
    table: str
    editable_columns: list[str]
    records: list[dict[str, Any]]


class OutbreakReview(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str

