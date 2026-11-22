"""Production configuration and private crop-photo lifecycle, with no live services."""
from dataclasses import replace
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.core.config import Settings, settings
from app.data_access.database import database, initialize_database
from app.main import app
from app.models.disease import DiseaseRequest
from app.models.user_plans import Account
from app.services.accounts import current_user
from app.services.disease_engine import identify_disease
from app.services.disease_agent import AgentResult
from app.services import evidence_storage


PROD_ENV = {
    "ENV": "prod",
    "DATABASE_URL": "sqlite:////tmp/must-not-be-used.db",
    "SUPABASE_DATABASE_URL": "postgresql://postgres:test@db.example.invalid:5432/postgres?sslmode=require",
    "SUPABASE_URL": "https://project.supabase.co",
    "SUPABASE_SECRET_KEY": "sb_secret_test-only",
    "SUPABASE_STORAGE_BUCKET": "disease-photos",
}
PHOTO = b"synthetic-photo-bytes"
CONTEXT = {"crop": "Tomato", "county": "Kiambu", "area": "Thika", "season": "Long rains",
           "symptoms": "brown spots and concentric rings"}


def production_settings(**overrides) -> Settings:
    with patch.dict(os.environ, {**PROD_ENV, **overrides}, clear=True):
        return Settings()


class SupabaseConfigurationTests(unittest.TestCase):
    def test_production_selects_supabase_database_and_redacts_credentials(self):
        config = production_settings()
        self.assertEqual(config.database_url, PROD_ENV["SUPABASE_DATABASE_URL"])
        self.assertNotIn("sb_secret_test-only", repr(config))
        self.assertNotIn("postgres:test", repr(config))
        with patch("app.data_access.database.settings", config), patch("app.data_access.database.psycopg.connect") as connect:
            with database():
                pass
        connect.assert_called_once_with(PROD_ENV["SUPABASE_DATABASE_URL"], autocommit=False)

    def test_each_production_setting_is_required_without_fallback(self):
        for name in PROD_ENV:
            if not name.startswith("SUPABASE_"):
                continue
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, name):
                production_settings(**{name: ""})

    def test_development_keeps_explicit_database(self):
        with patch.dict(os.environ, {**PROD_ENV, "ENV": "dev"}, clear=True):
            config = Settings()
        self.assertFalse(config.is_production)
        self.assertEqual(config.database_url, PROD_ENV["DATABASE_URL"])

    def test_production_rejects_sqlite_non_https_and_bucket_paths(self):
        for name, value in [("SUPABASE_DATABASE_URL", "sqlite:////tmp/test.db"),
                            ("SUPABASE_URL", "http://project.supabase.co"),
                            ("SUPABASE_URL", "https://project.supabase.co/storage/v1"),
                            ("SUPABASE_STORAGE_BUCKET", "bucket/../other")]:
            with self.subTest(name=name, value=value), self.assertRaisesRegex(ValueError, name):
                production_settings(**{name: value})


class SupabasePhotoTests(unittest.TestCase):
    def setUp(self):
        self.directory = self.enterContext(TemporaryDirectory())
        self.config = replace(production_settings(), outbreak_evidence_dir=Path(self.directory) / "images")
        self.requests = []
        self.public = False
        self.upload_failure = False
        self.download_failure = False
        self.cleanup_failure = False

        def provider(request):
            self.requests.append(request)
            self.assertEqual(request.headers["apikey"], PROD_ENV["SUPABASE_SECRET_KEY"])
            self.assertNotIn("authorization", request.headers)
            if request.method == "GET" and "/bucket/" in request.url.path:
                return httpx.Response(200, json={"id": "disease-photos", "public": self.public})
            if request.method == "POST":
                if self.upload_failure:
                    return httpx.Response(403, json={"error": "secret-provider-detail"})
                return httpx.Response(200, json={"Key": "test"})
            if request.method == "DELETE":
                return httpx.Response(500 if self.cleanup_failure else 200, json=[])
            return httpx.Response(500 if self.download_failure else 200, content=PHOTO)

        client = self.enterContext(httpx.Client(transport=httpx.MockTransport(provider)))
        self.enterContext(patch("app.services.evidence_storage.httpx.request", side_effect=client.request))

    def test_private_upload_read_and_delete_use_bucket_reference(self):
        reference = evidence_storage.save_image(PHOTO, "image/png", self.config)
        self.assertRegex(reference, r"^supabase://disease-photos/disease-cases/[a-f0-9]{32}\.png$")
        self.assertEqual(self.requests[-1].content, PHOTO)
        self.assertEqual(self.requests[-1].headers["content-type"], "image/png")
        self.assertEqual(self.requests[-1].headers["x-upsert"], "false")
        self.assertFalse(self.config.outbreak_evidence_dir.exists())
        self.assertEqual(evidence_storage.read_image(reference, self.config), (PHOTO, "image/png"))
        self.assertIn("/object/authenticated/disease-photos/", self.requests[-1].url.path)
        evidence_storage.cleanup_image(reference, self.config)
        self.assertEqual(json.loads(self.requests[-1].content), {"prefixes": [reference.split("disease-photos/", 1)[1]]})

    def test_public_bucket_rejects_upload_without_writing_disk(self):
        self.public = True
        with self.assertRaisesRegex(evidence_storage.EvidenceStorageError, "private"):
            evidence_storage.save_image(PHOTO, "image/jpeg", self.config)
        self.assertEqual(len(self.requests), 1)
        self.assertFalse(self.config.outbreak_evidence_dir.exists())

    def test_development_photo_stays_on_disk_and_outside_paths_are_rejected(self):
        dev = replace(settings, env="dev", outbreak_evidence_dir=self.config.outbreak_evidence_dir)
        reference = evidence_storage.save_image(PHOTO, "image/jpeg", dev)
        self.assertTrue(Path(reference).is_file())
        self.assertEqual(evidence_storage.read_image(reference, dev), (PHOTO, "image/jpeg"))
        outside = Path(self.directory) / "outside.jpg"
        outside.write_bytes(PHOTO)
        with self.assertRaises(FileNotFoundError):
            evidence_storage.read_image(str(outside), dev)
        evidence_storage.cleanup_image(reference, dev)
        self.assertFalse(Path(reference).exists())
        self.assertEqual(self.requests, [])

    def test_upload_failure_is_sanitized_and_attempts_cleanup(self):
        self.upload_failure = True
        with self.assertRaises(evidence_storage.EvidenceStorageError) as error:
            evidence_storage.save_image(PHOTO, "image/webp", self.config)
        self.assertNotIn("secret-provider-detail", str(error.exception))
        self.assertEqual(self.requests[-1].method, "DELETE")
        self.assertFalse(self.config.outbreak_evidence_dir.exists())

    def test_untrusted_references_never_make_remote_requests_or_read_disk(self):
        for reference in ["supabase://other-bucket/disease-cases/" + "a" * 32 + ".png",
                          "supabase://disease-photos/../private.png", "/etc/passwd"]:
            with self.subTest(reference=reference), self.assertRaises((evidence_storage.EvidenceStorageError, FileNotFoundError)):
                evidence_storage.read_image(reference, self.config)
        self.assertEqual(self.requests, [])

    def prepare_database(self):
        if not settings.seed_path.is_file():
            self.skipTest("Optional local fixtures are not present.")
        dev = replace(settings, env="test", load_demo_seed=True, database_url=f"sqlite:///{self.directory}/test.db",
                      outbreak_evidence_dir=Path(self.directory) / "images", openai_api_key=None)
        self.enterContext(patch("app.data_access.database.settings", dev))
        self.enterContext(patch("app.services.outbreak_recorder.settings", self.config))
        self.enterContext(patch("app.services.admin_service.settings", self.config))
        self.enterContext(patch("app.services.disease_agent._client", return_value=None))
        initialize_database()

    def test_no_consent_makes_no_storage_or_case_write(self):
        self.prepare_database()
        result = identify_disease(DiseaseRequest(**CONTEXT), PHOTO, "image/png")
        self.assertEqual(result.recording.status, "not_requested")
        self.assertEqual(self.requests, [])
        with database() as connection:
            self.assertEqual(connection.execute("SELECT count(*) FROM disease_cases").fetchone()[0], 0)

    def test_consented_case_photo_requires_admin_and_is_not_cached(self):
        self.prepare_database()
        result = identify_disease(DiseaseRequest(**CONTEXT, save_for_expert_review=True), PHOTO, "image/png")
        self.assertEqual(result.recording.status, "saved")
        with database() as connection:
            row = connection.execute("SELECT image_path FROM disease_cases WHERE id=?", (result.recording.case_id,)).fetchone()
        self.assertTrue(row["image_path"].startswith("supabase://disease-photos/"))
        url = f"/api/v1/admin/crop-health/disease_cases/{result.recording.case_id}/image"
        client = TestClient(app)
        request_count = len(self.requests)
        self.assertEqual(client.get(url).status_code, 401)
        self.assertEqual(len(self.requests), request_count)
        self.addCleanup(app.dependency_overrides.clear)
        app.dependency_overrides[current_user] = lambda: Account(id=1, name="Farmer", email="farmer@example.invalid", role="user")
        self.assertEqual(client.get(url).status_code, 403)
        self.assertEqual(len(self.requests), request_count)
        app.dependency_overrides[current_user] = lambda: Account(id=1, name="Admin", email="admin@example.invalid", role="admin")
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, PHOTO)
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.download_failure = True
        failed = client.get(url)
        self.assertEqual(failed.status_code, 503)
        self.assertNotIn(PROD_ENV["SUPABASE_SECRET_KEY"], failed.text)

    def test_database_failure_deletes_uploaded_photo_and_preserves_advice(self):
        self.prepare_database()
        with patch("app.data_access.disease_repository.save_disease_case", side_effect=OSError("database failure")):
            result = identify_disease(DiseaseRequest(**CONTEXT, save_for_expert_review=True), PHOTO, "image/png")
        self.assertTrue(result.candidates)
        self.assertEqual(result.recording.status, "failed")
        self.assertEqual([request.method for request in self.requests], ["GET", "POST", "DELETE"])

    def test_completed_match_links_same_private_photo_to_pending_outbreak(self):
        self.prepare_database()
        completed = AgentResult(selected_disease_ids=[1], confidence_level="low",
                                confidence_explanation="Simulated match for storage testing.",
                                next_actions=["Seek expert review."], photo_description="Brown leaf spots.",
                                image_observations=["Brown leaf spots"], local_database_match="matched")
        with patch("app.services.disease_engine.run_agent", return_value=completed):
            result = identify_disease(DiseaseRequest(**CONTEXT, save_for_expert_review=True), PHOTO, "image/png")
        self.assertEqual(result.recording.status, "saved")
        with database() as connection:
            row = connection.execute(
                """SELECT disease_cases.image_path case_photo, outbreaks.image_path outbreak_photo,
                          outbreaks.expert_approval FROM disease_cases
                   JOIN outbreaks ON outbreaks.id=disease_cases.outbreak_id WHERE disease_cases.id=?""",
                (result.recording.case_id,),
            ).fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["case_photo"], row["outbreak_photo"])
        self.assertEqual(row["expert_approval"], "pending")

    def test_cleanup_failure_warns_without_hiding_original_save_failure(self):
        self.cleanup_failure = True
        self.prepare_database()
        with patch("app.data_access.disease_repository.save_disease_case", side_effect=OSError("database failure")), self.assertLogs("app.services.evidence_storage", level="WARNING") as logs:
            result = identify_disease(DiseaseRequest(**CONTEXT, save_for_expert_review=True), PHOTO, "image/png")
        self.assertEqual(result.recording.status, "failed")
        self.assertIn("reconciliation", str(logs.output))
        self.assertNotIn(PROD_ENV["SUPABASE_SECRET_KEY"], str(logs.output))


if __name__ == "__main__":
    unittest.main()
