"""Persist consented review cases after model output validation, never from a tool."""
import json
from datetime import UTC, datetime
from uuid import uuid4

from app.core.config import settings
from app.data_access import disease_repository as repository
from app.models.disease import DiseaseRequest, DiseaseResponse, RecordingStatus

_IMAGE_SUFFIXES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def record_identification(request: DiseaseRequest, result: DiseaseResponse,
                          image: bytes | None, image_content_type: str | None) -> RecordingStatus:
    if not request.save_for_expert_review:
        return RecordingStatus()
    recorded_at = datetime.now(UTC).isoformat()
    stored_image = None
    try:
        if image and image_content_type in _IMAGE_SUFFIXES:
            settings.outbreak_evidence_dir.mkdir(parents=True, exist_ok=True)
            stored_image = settings.outbreak_evidence_dir / f"{uuid4().hex}{_IMAGE_SUFFIXES[image_content_type]}"
            stored_image.write_bytes(image)
        observation = request.model_dump()
        observation.update({"image_content_type": image_content_type if stored_image else None,
                            "consented_at": recorded_at, "observation_date": None})
        # Recorded-at identifies this submitted analysis, never symptom onset.
        snapshot = result.model_dump(exclude={"recording"})
        values = {
            "workflow_id": result.workflow_id, "created_at": recorded_at,
            "crop": result.crop, "county": result.location.county, "area": result.location.area,
            "season": result.season.label, "status": result.status, "engine": result.engine,
            "agent_runs_json": json.dumps([run.model_dump() for run in result.agent_runs]),
            "officer_report_json": result.officer_report.model_dump_json() if result.officer_report else None,
            "observation_json": json.dumps(observation), "result_json": json.dumps(snapshot),
            "image_path": str(stored_image.resolve()) if stored_image else None,
        }
        outbreak = None
        if result.analysis.status == "completed" and result.candidates:
            outbreak = {
                "disease_id": result.candidates[0].disease_id,
                "county": result.location.county, "area": result.location.area or "Area not supplied",
                "observed_period": recorded_at,
                "report_summary": "AI possible match submitted for expert review.",
                "evidence_status": "awaiting_validation", "expert_approval": "pending", "llm_identified": 1,
                "created_at": recorded_at,
                "coordinate_status": "user_supplied" if request.latitude is not None and request.longitude is not None else "not_supplied",
                "latitude": request.latitude, "longitude": request.longitude,
                "image_path": values["image_path"],
                "image_description": result.analysis.photo_description,
                "user_symptoms": request.symptoms.strip() if request.symptoms and request.symptoms.strip() else None,
            }
        case_id = repository.save_disease_case(values, outbreak)
        return RecordingStatus(status="saved", case_id=case_id,
                               message="Saved locally for officer review. This record is unverified and pending review.")
    except Exception:
        if stored_image:
            stored_image.unlink(missing_ok=True)
        raise
