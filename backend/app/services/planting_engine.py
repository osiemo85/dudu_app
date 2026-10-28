from app.core.disclaimers import PLANTING_DISCLAIMER
from app.data_access import planting_repository as repository
from app.models.common import Confidence, SourceRecord
from app.models.planting import (
    CropRecommendation,
    DecisionFactor,
    InputContext,
    LocalKnowledgeContext,
    PlantingClarification,
    PlantingRequest,
    PlantingResponse,
    WeatherContext,
)
from app.services.context import resolve_context


def _source(row: dict) -> SourceRecord:
    return SourceRecord(
        name=row.get("source_name", row.get("name", "Unknown")),
        date=row.get("source_date", "Unknown"),
        geographic_scope=row.get("source_scope", row.get("geographic_scope", "Unknown")),
        evidence_status=row.get("source_status", row.get("evidence_status", "awaiting_validation")),
        limitations=row.get("limitations", "No limitation statement supplied."),
    )


def _constraints(request: PlantingRequest) -> dict[str, str]:
    return {
        "irrigation": request.irrigation,
        "soil_drainage": request.soil_drainage,
        "farm_scale": request.farm_scale,
        "primary_goal": request.primary_goal,
        "risk_preference": request.risk_preference,
    }


def _clarification(
    request: PlantingRequest, field: str, question: str, reason: str
) -> PlantingResponse:
    location, season, location_record, season_record = resolve_context(request)
    return PlantingResponse(
        status="needs_clarification",
        location=location,
        season=season,
        agro_ecological_context=location_record.get("agro_ecological_context") if location_record else None,
        requested_crop=request.crop_preference,
        constraints=_constraints(request),
        recommendations=[],
        decision_factors=[],
        weather_context=None,
        evidence_gaps=[reason],
        review_triggers=[],
        clarification=PlantingClarification(field=field, question=question, reason=reason),
        sources=[_source(season_record)] if season_record else [],
        confidence=Confidence(level="low", explanation="A material planning input or local record is missing, so no crop recommendation was made."),
        disclaimer=PLANTING_DISCLAIMER,
    )


def _downgrade(suitability: str) -> str:
    return {"strong": "conditional", "conditional": "limited", "limited": "limited"}[suitability]


def recommend_planting(request: PlantingRequest) -> PlantingResponse:
    location, season, location_record, season_record = resolve_context(request)
    if (request.latitude is None or request.longitude is None) and (not request.county or not request.area):
        return _clarification(request, "location", "Which county and area are you planning for?", "Both county and area are needed to match local climate evidence; you can also use browser location.")
    if location.county is None or location.area is None or location_record is None:
        return _clarification(
            request,
            "location",
            "Which county and area are you planning for?",
            "Location is needed because planting windows and crop fit vary with rainfall pattern and agro-ecological context.",
        )
    if location_record and location_record.get("distance_km", 0) > 75:
        return _clarification(
            request,
            "manual_location",
            "The supplied position is too far from a demo area. Which listed county and area should be used instead?",
            f"The nearest demo area is approximately {location_record['distance_km']} km away, which is too uncertain for local planting advice.",
        )
    if season.label == "Unknown":
        return _clarification(
            request,
            "season",
            "Which local season or intended planting period are you planning for?",
            "The same crop can have different timing and risk in different local seasons.",
        )
    if season_record is None:
        return _clarification(
            request,
            "season",
            f"Can you select a locally listed season for {location.county}?",
            "The supplied period has no matching dated local season record, so applying a calendar would be unsafe.",
        )

    calendars = repository.fetch_relevant_plants(location.county, season.label, request.crop_preference)
    if not calendars:
        subject = request.crop_preference or "crop options"
        return _clarification(
            request,
            "crop_or_period",
            f"There is no local demo calendar for {subject} in {location.county} during {season.label}. Would you like to choose another crop or season?",
            "A national or unrelated calendar would hide an important evidence gap.",
        )

    climate_by_crop = {row["crop_id"]: repository.fetch_plant_weather_requirements(
        row["crop_id"], location.county, location.area, season.label
    ) for row in calendars}
    if any(not rows or any(rows[0][key] is None for key in ("avg_rainfall_mm", "avg_temp_min", "avg_temp_max")) for rows in climate_by_crop.values()):
        return _clarification(request, "climate_evidence", "Weather requirements or a local climate scenario are missing. Can you choose another area, season, or crop?", "The demo cannot rank crops without both a local climate scenario and crop weather requirements.")

    weather = repository.get_weather(location.county, season.label)
    factors = [
        DecisionFactor(
            factor="Local context",
            finding=location_record["agro_ecological_context"] if location_record else "No agro-ecological record",
            impact="supports" if location_record else "gap",
            evidence_status=location_record.get("evidence_status", "awaiting_validation") if location_record else "awaiting_validation",
        ),
        DecisionFactor(
            factor="Season record",
            finding=f"{season.label}: {season.period}; {season.basis}",
            impact="supports",
            evidence_status=season_record["evidence_status"],
        ),
    ]
    gaps = [
        "No live weather service is connected; confirm effective rainfall onset and the current forecast locally.",
        "No soil test, field slope, budget, labour plan, prices, or current market commitments were supplied.",
        "Input records do not confirm certification, quality, price, or supplier stock.",
    ]
    if weather:
        factors.append(DecisionFactor(factor="Weather scenario", finding=weather["rainfall_context"], impact="caution", evidence_status=weather["evidence_status"]))
    else:
        gaps.append("No dated local weather scenario matched this county and season.")
    if request.irrigation == "unknown":
        factors.append(DecisionFactor(factor="Water access", finding="Irrigation or backup water was not specified.", impact="gap", evidence_status="user_observation_missing"))
    else:
        factors.append(DecisionFactor(factor="Water access", finding=f"User reported irrigation as {request.irrigation}.", impact="supports" if request.irrigation == "available" else "caution", evidence_status="user_supplied"))
    if request.soil_drainage == "unknown":
        factors.append(DecisionFactor(factor="Field drainage", finding="Drainage was not specified.", impact="gap", evidence_status="user_observation_missing"))
    else:
        factors.append(DecisionFactor(factor="Field drainage", finding=f"User described drainage as {request.soil_drainage}.", impact="supports" if request.soil_drainage == "good" else "caution", evidence_status="user_supplied"))

    source_rows: list[dict] = [season_record, *calendars]
    if weather:
        source_rows.append(weather)
    recommendations: list[CropRecommendation] = []
    dry_scenario = bool(weather and any(word in weather["rainfall_context"].lower() for word in ("below-normal", "erratic", "dry")))

    for calendar in calendars:
        crop = calendar["crop"]
        climate = climate_by_crop[calendar["crop_id"]][0]
        source_rows.append(climate)
        source_rows.append({"source_name": climate["requirement_source_name"], "source_date": climate["requirement_source_date"], "geographic_scope": climate["requirement_source_scope"], "source_status": climate["requirement_source_status"], "limitations": climate["requirement_limitations"]})
        rainfall_matches = climate["min_rainfall_mm"] <= climate["avg_rainfall_mm"] <= climate["max_rainfall_mm"]
        temperature_matches = climate["min_temp_c"] <= climate["avg_temp_min"] and climate["avg_temp_max"] <= climate["max_temp_c"]
        suitability = "strong" if rainfall_matches and temperature_matches else "conditional" if rainfall_matches or temperature_matches else "limited"
        rationale = [calendar["rationale"], f"Typical maturity context: {calendar['typical_maturity_days']}. Water requirement: {calendar['water_requirement'].replace('_', ' ')}."]
        rationale.append(f"Simulated seasonal rainfall {climate['avg_rainfall_mm']} mm versus test range {climate['min_rainfall_mm']}–{climate['max_rainfall_mm']} mm; temperature {climate['avg_temp_min']}–{climate['avg_temp_max']} °C versus test range {climate['min_temp_c']}–{climate['max_temp_c']} °C. These figures are fictional, not a forecast or validated crop requirements.")
        risks = [calendar["risk_notes"]]

        if dry_scenario and request.irrigation in {"none", "limited", "unknown"} and calendar["water_requirement"] != "low":
            suitability = _downgrade(suitability)
            risks.append("The simulated dry/erratic scenario and limited or unknown backup water weaken this option; verify current rainfall evidence.")
            rationale.append("Suitability was reduced one level because water risk is unresolved in the available scenario.")
        if request.soil_drainage == "poor" and crop in {"Bean", "Potato"}:
            suitability = _downgrade(suitability)
            risks.append("User-reported poor drainage raises establishment and disease risk for this option.")
            rationale.append("Suitability was reduced one level because the field was reported as poorly drained.")
        if request.risk_preference == "low" and suitability == "limited":
            risks.append("This limited-fit option conflicts with the stated low risk preference; compare stronger local options before committing land or money.")
        if request.primary_goal in {"market", "both"}:
            risks.append("No live price, buyer, transport, storage, or demand evidence is connected; validate the market plan before scaling.")
        if request.farm_scale == "commercial":
            risks.append("Commercial-scale use needs a field-specific budget, cash-flow, labour, mechanization, market, and downside-risk review not available in this demo.")

        extension = repository.get_extension_advice(calendar["crop_id"], location.county, season.label)
        local = repository.get_local_knowledge(calendar["crop_id"], location.county)
        inputs = repository.get_inputs(calendar["crop_id"])
        source_rows.extend([*extension, *local, *inputs])
        recommendations.append(
            CropRecommendation(
                crop_id=calendar["crop_id"],
                crop=crop,
                suitability=suitability,
                planting_window=calendar["planting_window"],
                rationale=rationale,
                practical_steps=[step.strip() for step in calendar["practical_steps"].split(";") if step.strip()],
                risks_and_checks=risks,
                extension_context=[row["advice"] for row in extension],
                input_context=[
                    InputContext(
                        input_type=row["input_type"], name=row["name"],
                        certification_status=row["certification_status"], availability_status=row["availability_status"],
                        guidance=row["guidance"], evidence_status=row["evidence_status"],
                    ) for row in inputs
                ],
                local_knowledge=[
                    LocalKnowledgeContext(
                        guidance=row["guidance"], community_attribution=row["community_attribution"],
                        permission_status=row["permission_status"], evidence_status=row["evidence_status"],
                    ) for row in local
                ],
            )
        )

    recommendations.sort(key=lambda item: ({"strong": 0, "conditional": 1, "limited": 2}[item.suitability], item.crop))
    recommendations = recommendations[:2]
    unique_sources: dict[tuple[str, str], SourceRecord] = {}
    for row in source_rows:
        source = _source(row)
        unique_sources[(source.name, source.date)] = source
    unknown_constraints = sum(value == "unknown" for value in _constraints(request).values())
    confidence_level = "medium" if unknown_constraints <= 2 else "low"
    confidence = Confidence(
        level=confidence_level,
        explanation=(
            "The location, season, and crop calendar match editable local demo records. Confidence is capped because the evidence is simulated and no live weather, soil, input, cost, or market verification is connected."
        ),
    )
    return PlantingResponse(
        status="recommendations",
        location=location,
        season=season,
        agro_ecological_context=location_record.get("agro_ecological_context") if location_record else None,
        requested_crop=request.crop_preference,
        constraints=_constraints(request),
        recommendations=recommendations,
        decision_factors=factors,
        weather_context=WeatherContext(
            period=weather["period"], rainfall_context=weather["rainfall_context"],
            planning_implication=weather["planning_implication"], evidence_status=weather["evidence_status"],
        ) if weather else None,
        evidence_gaps=gaps,
        review_triggers=[
            "Reassess before planting if rainfall onset or the current forecast differs from the dated scenario.",
            "Reassess after a soil test or field drainage check changes the fertility or water-management plan.",
            "Reassess before purchase if seed identity, certification, price, supplier stock, or input guidance cannot be verified.",
            "For market production, stop and review if there is no credible buyer, price, transport, storage, or downside plan.",
        ],
        clarification=None,
        sources=list(unique_sources.values()),
        confidence=confidence,
        disclaimer=PLANTING_DISCLAIMER,
    )
