"""Canonical crop parts shared by disease intake and symptom records."""

PLANT_PARTS = (
    "leaf", "leaf underside", "stem", "tuber", "tuber skin", "tuber flesh",
    "root", "fruit", "flower", "seed", "whole plant",
)


def valid_plant_part(value: object) -> bool:
    return isinstance(value, str) and value in PLANT_PARTS
