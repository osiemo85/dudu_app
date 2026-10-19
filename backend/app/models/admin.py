from typing import Any

from pydantic import BaseModel


class AdminRecord(BaseModel):
    values: dict[str, Any]


class AdminTable(BaseModel):
    table: str
    editable_columns: list[str]
    records: list[dict[str, Any]]

