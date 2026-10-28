"""Bounded lookup for the simulated agrovet directory."""
from app.data_access import disease_repository as repository
from app.models.common import SourceRecord
from app.models.disease import NearbyAgrovet, NearbyAgrovetsResponse


DIRECTORY_NOTICE = (
    "This is a simulated directory matched to your selected county and area. "
    "It does not verify distance, business details, stock, current prices, product approval, or treatment suitability. "
    "Confirm the possible diagnosis with a qualified professional and follow the applicable product label."
)


def _source(row: dict) -> SourceRecord:
    return SourceRecord(
        name=row["source_name"],
        date=row["source_date"],
        geographic_scope=row["geographic_scope"],
        evidence_status=row["source_status"],
        limitations=row["limitations"],
    )


def find_nearby_agrovets(county: str, area: str, disease_ids: list[int]) -> NearbyAgrovetsResponse:
    """Find records only for possible diseases already selected by the result UI."""
    selected_ids = list(dict.fromkeys(disease_ids))
    rows = repository.get_nearby_agrovets(county, area, selected_ids)
    return NearbyAgrovetsResponse(
        county=county,
        area=area,
        disease_ids=selected_ids,
        agrovets=[
            NearbyAgrovet(
                disease_id=row["disease_id"], disease=row["disease_name"], name=row["name"],
                address=row["address"], phone_number=row["phone_number"], treatment_name=row["treatment_name"],
                indicative_cost_kes=row["indicative_cost_kes"], evidence_status=row["evidence_status"], source=_source(row),
            )
            for row in rows
        ],
        notice=DIRECTORY_NOTICE,
    )
