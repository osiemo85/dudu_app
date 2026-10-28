import logging
from pathlib import Path
import traceback
from uuid import uuid4

from openai import APIConnectionError, APIStatusError, APITimeoutError, AuthenticationError, RateLimitError

from app.core.disclaimers import DISEASE_DISCLAIMER
from app.data_access import disease_repository as repository
from app.models.common import Confidence, SourceRecord
from app.models.disease import (
    Clarification,
    AnalysisStatus,
    AgentRun,
    RecordingStatus,
    DiseaseCandidate,
    DiseaseRequest,
    DiseaseResponse,
    MatchedEvidence,
    OutbreakContext,
    TreatmentOption,
)
from app.services.context import resolve_context
from app.services.disease_agent import AgentEvidenceError, AgentResult, run_agent
from app.services.outbreak_recorder import record_identification


logger = logging.getLogger(__name__)


def _analysis_error_code(exc: Exception) -> str:
    if isinstance(exc, AgentEvidenceError):
        return exc.code
    if isinstance(exc, AuthenticationError):
        return "provider_authentication_failed"
    if isinstance(exc, RateLimitError):
        return "provider_rate_limited"
    if isinstance(exc, APITimeoutError):
        return "provider_timeout"
    if isinstance(exc, APIConnectionError):
        return "provider_connection_failed"
    if isinstance(exc, APIStatusError):
        return f"provider_http_{getattr(exc, 'status_code', 'error')}"
    return f"unexpected_{type(exc).__name__.lower()}"


def _analysis_failure(exc: Exception) -> str:
    # Never expose provider exception text: authentication errors can contain keys.
    if isinstance(exc, AgentEvidenceError):
        return f"The AI result could not be validated against the local demo evidence ({exc.code}). Please retry analysis or provide written symptoms."
    if isinstance(exc, AuthenticationError):
        return "The AI provider rejected the configured API key. The server administrator must update the key and restart the backend."
    if isinstance(exc, RateLimitError):
        return "The AI provider reported a quota or rate limit. Check the provider account or try again later."
    if isinstance(exc, (APITimeoutError, APIConnectionError)):
        return "The AI provider could not be reached. Please try again later."
    if isinstance(exc, APIStatusError):
        return "The AI provider rejected the analysis request. The server administrator should check model access and configuration."
    return "AI analysis could not be completed. Please retry or provide written symptoms."


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


def _identify_disease(request: DiseaseRequest, image: bytes | None, image_content_type: str | None) -> DiseaseResponse:
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
    failed_runs: list[AgentRun] = []
    matched_written_symptoms = bool(request.symptoms and any(row["score"] > 0 for row in deterministic))
    analysis = AnalysisStatus(
        status="unavailable",
        local_database_match=("matched" if matched_written_symptoms else "not_matched") if request.symptoms else "not_checked",
        message="No AI provider is configured. Photo analysis requires a server-side API key.",
    )
    try:
        resolved_request = request.model_copy(update={"county": location.county, "area": location.area})
        agent_result = run_agent(resolved_request, image, image_content_type)
    except Exception as exc:
        failed_runs = getattr(exc, "agent_runs", [])
        if not failed_runs and isinstance(getattr(exc, "agent_run", None), AgentRun):
            failed_runs.append(exc.agent_run)
        analysis.message = _analysis_failure(exc)
        analysis.error_code = _analysis_error_code(exc)
        frames = traceback.extract_tb(exc.__traceback__, limit=-1)
        origin = f"{Path(frames[-1].filename).name}:{frames[-1].lineno}" if frames else "unknown"
        logger.warning(
            "Disease AI analysis failed: error_type=%s error_code=%s http_status=%s origin=%s",
            type(exc).__name__, analysis.error_code,
            getattr(exc, "status_code", None), origin,
        )

    if agent_result:
        analysis = AnalysisStatus(
            status="completed", image_analyzed=bool(image), image_observations=agent_result.image_observations,
            photo_description=agent_result.photo_description,
            search_observations=agent_result.selected_search_observations,
            local_database_match=agent_result.local_database_match,
            message="AI analysis completed using the supplied photo and/or written observations. Local supporting records remain simulated.",
        )
    elif image and not (request.symptoms or "").strip():
        result = _clarification_response(request, "symptoms", "Please describe the visible symptoms, or retry photo analysis once the AI service is available.", "The photo was not analyzed, so there is no observation to match against the demo records.")
        result.analysis = analysis
        result.engine = "deterministic_demo"
        result.agent_runs = failed_runs
        return result

    selected_ids = agent_result.selected_disease_ids if agent_result else [row["id"] for row in deterministic if row["score"] > 0]
    result_symptoms = " ".join(agent_result.selected_search_observations) if agent_result else symptoms
    selected = repository.get_disease_candidates(selected_ids, result_symptoms, request.affected_part)
    selected = [row for row in selected if row["crop"].lower() == request.crop.lower()]
    if not selected:
        if agent_result and agent_result.local_database_match == "not_checked":
            question = "Could you describe the symptoms or add a clearer photo?"
            reason = "No clear symptoms could be identified in the photo, so local database records were not searched."
        else:
            question = "No possible cause was sufficiently supported by the local demo search."
            reason = "The observed symptoms did not support a possible cause in the local demo records. The database is limited, so this does not rule out a disease that is absent from it."
        result = _clarification_response(request, "symptoms_or_image", question, reason)
        result.analysis = analysis
        if agent_result:
            result.analysis.local_database_match = agent_result.local_database_match
        result.engine = agent_result.engine if agent_result else "deterministic_demo"
        result.next_actions = agent_result.next_actions if agent_result else []
        result.agent_runs = agent_result.agent_runs if agent_result else failed_runs
        result.officer_report = agent_result.officer_report if agent_result else None
        if agent_result:
            result.confidence = Confidence(level=agent_result.confidence_level, explanation=agent_result.confidence_explanation)
        return result
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
        status="possible_matches", crop=request.crop, growth_stage=request.growth_stage,
        location=location, season=season, candidates=candidates, outbreak_context=outbreaks,
        treatment_options=treatments, next_actions=next_actions, clarification=None, sources=sources,
        disclaimer=DISEASE_DISCLAIMER, confidence=confidence, engine=engine, analysis=analysis,
        agent_runs=agent_result.agent_runs if agent_result else failed_runs,
        officer_report=agent_result.officer_report if agent_result else None,
    )


def identify_disease(request: DiseaseRequest, image: bytes | None, image_content_type: str | None) -> DiseaseResponse:
    result = _identify_disease(request, image, image_content_type)
    result.workflow_id = uuid4().hex
    try:
        result.recording = record_identification(request, result, image, image_content_type)
    except Exception as exc:
        logger.warning("Disease history save failed: error_type=%s", type(exc).__name__)
        result.recording = RecordingStatus(status="failed", message="The result could not be saved for officer review. Please retry; this result remains available here.")
    return result
