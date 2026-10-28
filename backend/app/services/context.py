from app.data_access import disease_repository as repository
from app.models.common import LocationContext, SeasonContext
from typing import Protocol


class ContextRequest(Protocol):
    latitude: float | None
    longitude: float | None
    county: str | None
    area: str | None
    season: str | None


def resolve_context(request: ContextRequest) -> tuple[LocationContext, SeasonContext, dict | None, dict | None]:
    location_record = None
    source = "unknown"
    correction_note = None

    if request.latitude is not None and request.longitude is not None:
        location_record = repository.resolve_nearest_location(request.latitude, request.longitude)
        source = "browser_location"
        if location_record:
            correction_note = f"Nearest demo area, approximately {location_record['distance_km']} km from the supplied position. Please correct it if wrong."
    elif request.county:
        location_record = repository.find_location(request.county, request.area)
        source = "user_selected"

    if location_record:
        location = LocationContext(
            label=f"{location_record['area']}, {location_record['county']}",
            county=location_record["county"],
            area=location_record["area"],
            source=source,
            correction_note=correction_note,
        )
    else:
        location = LocationContext(label="Unknown", county=request.county, area=request.area, source="unknown")

    season_record = None
    if location.county and request.season:
        season_record = repository.resolve_season(location.county, request.season)
    if season_record:
        season = SeasonContext(label=season_record["label"], period=season_record["period"], basis=season_record["basis"])
    elif request.season:
        season = SeasonContext(label=request.season, period=None, basis="User supplied; no matching local demo season record")
    else:
        season = SeasonContext(label="Unknown", period=None, basis="No season was supplied")
    return location, season, location_record, season_record
