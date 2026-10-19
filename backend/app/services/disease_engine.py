from app.core.disclaimers import DISEASE_DISCLAIMER
from app.data_access import disease_repository as repository
from app.models.common import Confidence, SourceRecord
from app.models.disease import (
    Clarification,
    DiseaseCandidate,
    DiseaseRequest,
    DiseaseResponse,
    MatchedEvidence,
    OutbreakContext,
    TreatmentOption,
)
from app.services.context import resolve_context
from app.services.disease_agent import AgentResult, run_agent


def _source(row: dict) -> SourceRecord:
    return SourceRecord(
        name=row.get("source_name", row.get("name", "Unknown")),
        date=row.get("source_date", "Unknown"),
        geographic_scope=row.get("source_scope", row.get("geographic_scope", "Unknown")),
        evidence_status=row.get("source_status", row.get("evidence_status", "awaiting_validation")),
        limitations=row.get("limitations", "No limitation statement supplied."),
    )


def _clarification_response(request: DiseaseRequest, field: str, question: str, reason: str) -> DiseaseResponse:
    location, season, _, season_record = resolve_context(request)
    sources = [_source(season_record)] if season_record else []
    return DiseaseResponse(
        status="needs_clarification",
        crop=request.crop,
        growth_stage=request.growth_stage,
        location=location,
        season=season,
        candidates=[],
        outbreak_context=[],
        treatment_options=[],
        next_actions=[],
        clarification=Clarification(field=field, question=question, reason=reason),
        sources=sources,
        disclaimer=DISEASE_DISCLAIMER,
        confidence=Confidence(level="low", explanation="A material input is missing, so no local match was attempted."),
        engine="rules",
    )


def identify_disease(request: DiseaseRequest, image: bytes | None, image_content_type: str | None) -> DiseaseResponse:
    location, season, _, season_record = resolve_context(request)
    if location.county is None:
        return _clarification_response(request, "location", "Which county and area is the crop in?", "Location is needed to select relevant local records and avoid misleading outbreak context.")
    if season.label == "Unknown":
        return _clarification_response(request, "season", "Which local season or observation period applies?", "Disease pressure and the relevance of dated records can change by season.")
    if not request.symptoms and not image:
        return _clarification_response(request, "symptoms_or_image", "Please add a clear crop photo or describe the visible symptoms.", "At least one observation is needed to look for possible matches.")

    symptoms = request.symptoms or "Image supplied without written symptoms"
    deterministic = repository.search_disease_candidates(request.crop, symptoms, request.affected_part)
    agent_result: AgentResult | None = None
    try:
        resolved_request = request.model_copy(update={"county": location.county, "area": location.area})
        agent_result = run_agent(resolved_request, image, image_content_type)
    except Exception:
        agent_result = None

    selected_ids = agent_result.selected_disease_ids if agent_result and agent_result.selected_disease_ids else [row["id"] for row in deterministic]
    selected = repository.get_disease_candidates(selected_ids, symptoms, request.affected_part)
    if request.crop:
        selected = [row for row in selected if row["crop"].lower() == request.crop.lower()]
    if not selected:
        selected = deterministic[:3]
    selected_ids = [row["id"] for row in selected]

    candidates = []
    for index, row in enumerate(selected):
        evidence = [MatchedEvidence(observation=match["symptom"], match=f"Matched {match['plant_part']} wording in the symptom table") for match in row["matches"]]
        candidates.append(
            DiseaseCandidate(
                disease_id=row["id"],
                name=row["common_name"],
                scientific_name=row["scientific_name"],
                possibility="closer possible match" if index == 0 else "other possible match",
                summary=row["summary"],
                matched_evidence=evidence,
            )
        )

    outbreaks_raw = repository.get_outbreak_context(location.county, selected_ids)
    treatments_raw = repository.get_treatments(location.county, request.crop, selected_ids)
    outbreaks = [
        OutbreakContext(
            disease=row["disease_name"], area=f"{row['area']}, {row['county']}", observed_period=row["observed_period"],
            summary=row["report_summary"], evidence_status=row["evidence_status"], current_outbreak_claimed=False,
        )
        for row in outbreaks_raw
    ]
    treatments = [
        TreatmentOption(
            disease=row["disease_name"], action=row["action"], treatment_type=row["treatment_type"],
            requires_verified_diagnosis=bool(row["requires_verified_diagnosis"]), evidence_status=row["evidence_status"], source=_source(row),
        )
        for row in treatments_raw
    ]
    source_rows = {row["source_id"]: row for row in selected + outbreaks_raw + treatments_raw}
    if season_record:
        source_rows[season_record["source_id"]] = season_record
    sources = [_source(row) for row in source_rows.values()]

    if agent_result:
        confidence = Confidence(level=agent_result.confidence_level, explanation=agent_result.confidence_explanation)
        next_actions = agent_result.next_actions or [
            "Take another clear photo of the affected plant part.",
            "Ask a local extension officer to confirm the cause before choosing treatment.",
        ]
        engine = agent_result.engine
    else:
        best_score = selected[0]["score"] if selected else 0
        level = "medium" if best_score >= 1 else "low"
        confidence = Confidence(level=level, explanation="This response uses wording overlap with editable simulated symptom records; an AI image interpretation was not available in this response.")
        next_actions = ["Photograph the affected part in good light and include a healthy plant for comparison.", "Note when symptoms started and whether they are spreading.", "Ask a local extension officer to confirm the cause before choosing a crop-protection product."]
        engine = "deterministic_demo"

    return DiseaseResponse(
        status="possible_matches", crop=request.crop or "Unconfirmed crop", growth_stage=request.growth_stage,
        location=location, season=season, candidates=candidates, outbreak_context=outbreaks,
        treatment_options=treatments, next_actions=next_actions, clarification=None, sources=sources,
        disclaimer=DISEASE_DISCLAIMER, confidence=confidence, engine=engine,
    )
