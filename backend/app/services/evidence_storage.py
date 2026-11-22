"""Store consented crop photos locally in development or privately in Supabase."""
import logging
from pathlib import Path
import re
from urllib.parse import quote
from uuid import uuid4

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)
IMAGE_SUFFIXES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_MEDIA_TYPES = {suffix: media_type for media_type, suffix in IMAGE_SUFFIXES.items()}


class EvidenceStorageError(RuntimeError):
    """A safe error that never includes credentials or provider response bodies."""


def _request(config: Settings, method: str, path: str, **kwargs) -> httpx.Response:
    try:
        # New Supabase secret keys belong in apikey, not a JWT Bearer header.
        response = httpx.request(
            method, f"{config.supabase_url}/storage/v1/{path}",
            headers={"apikey": config.supabase_secret_key, **kwargs.pop("headers", {})},
            timeout=30, follow_redirects=False, **kwargs,
        )
        if not response.is_success:
            raise EvidenceStorageError("Supabase photo storage request failed.")
        return response
    except httpx.HTTPError:
        raise EvidenceStorageError("Supabase photo storage is unavailable.") from None


def _require_private_bucket(config: Settings) -> None:
    try:
        bucket = _request(config, "GET", f"bucket/{quote(config.supabase_storage_bucket, safe='')}").json()
    except ValueError:
        raise EvidenceStorageError("Supabase storage bucket configuration is unavailable.") from None
    if not isinstance(bucket, dict) or bucket.get("public") is not False:
        raise EvidenceStorageError("Crop review photos require a private Supabase bucket.")


def _remote_key(reference: str, config: Settings) -> str:
    prefix = f"supabase://{config.supabase_storage_bucket}/"
    key = reference.removeprefix(prefix)
    if not reference.startswith(prefix) or not re.fullmatch(r"disease-cases/[a-f0-9]{32}\.(jpg|png|webp)", key):
        raise EvidenceStorageError("Invalid photo storage reference.")
    return key


def save_image(image: bytes, content_type: str, config: Settings) -> str:
    filename = f"{uuid4().hex}{IMAGE_SUFFIXES[content_type]}"
    if config.is_production:
        _require_private_bucket(config)
        key = f"disease-cases/{filename}"
        reference = f"supabase://{config.supabase_storage_bucket}/{key}"
        try:
            _request(config, "POST", f"object/{config.supabase_storage_bucket}/{key}",
                     content=image, headers={"Content-Type": content_type, "x-upsert": "false"})
        except EvidenceStorageError:
            # A timeout can occur after the provider accepted the upload.
            cleanup_image(reference, config)
            raise
        return reference
    config.outbreak_evidence_dir.mkdir(parents=True, exist_ok=True)
    path = config.outbreak_evidence_dir / filename
    try:
        path.write_bytes(image)
    except OSError:
        path.unlink(missing_ok=True)
        raise
    return str(path.resolve())


def cleanup_image(reference: str, config: Settings) -> None:
    """Best-effort compensation when a consented case cannot be committed."""
    try:
        if reference.startswith("supabase://"):
            key = _remote_key(reference, config)
            _request(config, "DELETE", f"object/{config.supabase_storage_bucket}", json={"prefixes": [key]})
        else:
            path = Path(reference).resolve()
            if path.is_relative_to(config.outbreak_evidence_dir.resolve()):
                path.unlink(missing_ok=True)
    except (EvidenceStorageError, OSError):
        # Never hide the original save failure or print the object/location data.
        logger.warning("Crop photo cleanup failed; storage reconciliation is required.")


def read_image(reference: str, config: Settings) -> tuple[bytes, str]:
    if reference.startswith("supabase://"):
        key = _remote_key(reference, config)
        _require_private_bucket(config)
        response = _request(config, "GET", f"object/authenticated/{config.supabase_storage_bucket}/{key}")
        return response.content, _MEDIA_TYPES[Path(key).suffix]
    # Production must never try a local filesystem path from a historical record.
    if config.is_production:
        raise FileNotFoundError("Photo is not in Supabase Storage.")
    path = Path(reference).resolve()
    if not path.is_relative_to(config.outbreak_evidence_dir.resolve()) or not path.is_file():
        raise FileNotFoundError("Photo unavailable.")
    content_type = _MEDIA_TYPES.get(path.suffix)
    if not content_type:
        raise FileNotFoundError("Unsupported photo format.")
    return path.read_bytes(), content_type
