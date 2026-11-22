"""Disease UI contracts against an empty database, without seed files."""
import os
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from urllib.parse import parse_qsl, urlencode, urlsplit
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import Settings, settings
from app.data_access.database import database, initialize_database, psycopg
from app.main import app


class ManualDiseaseFlow:
    def prepare(self, url, folder):
        config = replace(settings, env="test", database_url=url, load_demo_seed=False,
                         seed_path=folder / "no-fixtures" / "seed.sql",
                         outbreak_evidence_dir=folder / "photos", openai_api_key=None)
        self.enterContext(patch("app.data_access.database.settings", config))
        self.enterContext(patch("app.services.outbreak_recorder.settings", config))
        self.enterContext(patch("app.services.disease_agent._client", return_value=None))
        self.client = self.enterContext(TestClient(app))

    def admin(self):
        password = "manual-ui-test-123"
        response = self.client.post("/api/v1/auth/register", json={
            "name": "Manual test admin", "email": "manual@example.com", "password": password,
            "password_confirmation": password,
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(self.client.get("/api/v1/admin/crop-health/sources").status_code, 403)
        # One-time administrator bootstrap; evidence is entered only through API
        # endpoints used by the UI, never by a seed script or direct SQL writes.
        with database() as connection:
            connection.execute("UPDATE users SET role='admin' WHERE id=?", (response.json()["id"],))

    def add(self, table, **values):
        response = self.client.post(f"/api/v1/admin/crop-health/{table}", json={"values": values})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def enter_guide_records(self):
        self.admin()
        source = self.add("sources", name="Duducare manual disease test", source_date="2026-11-22",
                          geographic_scope="Kiambu / Thika test area", evidence_status="simulated",
                          limitations="Fictional UI test data. No diagnosis, current outbreak, stock, price or endorsement is established.")
        self.add("locations", county="Kiambu", area="Thika", latitude="-1.0333", longitude="37.0693",
                 agro_ecological_context="Manually chosen test coordinates; not verified GPS.", evidence_status="manually_supplied")
        self.add("seasons", county="Kiambu", label="Long rains", period="March–June (test period)",
                 start_month="3", end_month="6", basis="Explicit test selection; not a current rainfall advisory.", source_id=str(source["id"]))
        disease = self.add("diseases", crop="Tomato", common_name="Tomato leaf-spot test record", scientific_name=None,
                           summary="Fictional possible-match record for testing symptom lookup only.",
                           source_id=str(source["id"]), evidence_status="simulated")
        for symptom, weight in (("brown spots", "1.0"), ("concentric rings", "1.5")):
            self.add("disease_symptoms", disease_id=str(disease["id"]), plant_part="leaf", symptom=symptom, weight=weight)
        self.add("treatments", disease_id=str(disease["id"]), crop="Tomato", geographic_scope="Kiambu",
                 action="Record the spread and ask an extension officer to confirm the cause before selecting any product.",
                 treatment_type="general monitoring", requires_verified_diagnosis=0,
                 source_id=str(source["id"]), evidence_status="simulated")
        self.add("outbreaks", disease_id=str(disease["id"]), county="Kiambu", area="Thika",
                 observed_period="April 2024 (fictional)", report_summary="Historical fictional UI example; not a current outbreak.",
                 source_id=str(source["id"]), evidence_status="simulated", coordinate_status="manually_supplied",
                 latitude=None, longitude=None, llm_identified=0)
        self.add("agrovets", disease_id=str(disease["id"]), name="Fictional Thika test directory", county="Kiambu", area="Thika",
                 address="Fictional test address; do not travel here.", phone_number="Not a working contact",
                 treatment_name="Extension referral discussion (test)", indicative_cost_kes="Unknown; test listing only",
                 source_id=str(source["id"]), evidence_status="simulated")
        return source, disease

    def identify(self, **changes):
        data = {"crop": "Tomato", "county": "Kiambu", "area": "Thika", "season": "Long rains",
                "symptoms": "brown spots with concentric rings", **changes}
        response = self.client.post("/api/v1/disease/identify", data=data)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_empty_database_startup_and_independent_module_clarifications(self):
        self.assertEqual(self.client.get("/api/v1/health").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/admin/crop-health/sources").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/disease/locations").json(), [])
        self.assertEqual(self.identify()["status"], "needs_clarification")
        planting = self.client.post("/api/v1/planting/demo-recommend", json={}).json()
        self.assertEqual(planting["status"], "needs_clarification")
        initialize_database()
        with database() as connection:
            for table in ("sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "outbreaks", "agrovets", "crops"):
                self.assertEqual(connection.execute(f"SELECT COUNT(*) AS total FROM {table}").fetchone()["total"], 0)

    def test_manual_entries_power_symptoms_directory_and_no_match(self):
        source, disease = self.enter_guide_records()
        for table in ("sources", "locations", "seasons", "diseases", "disease_symptoms", "treatments", "outbreaks", "agrovets"):
            listing = self.client.get(f"/api/v1/admin/crop-health/{table}")
            self.assertEqual(listing.status_code, 200, listing.text)
            self.assertGreater(listing.json()["total"], 0)
        listing = self.client.get("/api/v1/admin/crop-health/diseases").json()
        self.assertEqual(listing["reference_options"]["source_id"], [{"id": source["id"], "label": source["name"]}])
        result = self.identify()
        self.assertEqual(result["status"], "possible_matches")
        self.assertEqual(result["candidates"][0]["name"], disease["common_name"])
        self.assertTrue(result["sources"] and result["disclaimer"])
        self.assertEqual(result["location"]["label"], "Thika, Kiambu")
        self.assertEqual(result["season"]["label"], "Long rains")
        self.assertTrue(result["treatment_options"])
        self.assertFalse(result["outbreak_context"][0]["current_outbreak_claimed"])
        directory = self.client.get("/api/v1/disease/nearby-agrovets", params={
            "county": "Kiambu", "area": "Thika", "disease_id": disease["id"],
        }).json()
        self.assertTrue(directory["agrovets"])
        unmatched = self.identify(symptoms="xyzq")
        self.assertEqual(unmatched["status"], "needs_clarification")
        self.assertEqual(unmatched["candidates"], [])

    def test_consent_review_and_restart_preserve_only_user_entered_records(self):
        self.enter_guide_records()
        self.identify()
        self.assertEqual(self.client.get("/api/v1/admin/crop-health/disease_cases").json()["total"], 0)
        result = self.identify(save_for_expert_review="true")
        self.assertEqual(result["recording"]["status"], "saved")
        case_id = result["recording"]["case_id"]
        endpoint = f"/api/v1/admin/crop-health/disease_cases/{case_id}"
        response = self.client.put(endpoint, json={"values": {"expert_approval": "rejected", "expert_review_note": ""}})
        self.assertEqual(response.status_code, 422)
        response = self.client.put(endpoint, json={"values": {
            "expert_approval": "rejected", "expert_review_note": "UI test only; no expert diagnosis was made.",
        }})
        self.assertEqual(response.status_code, 200, response.text)
        initialize_database()
        self.assertEqual(self.client.get("/api/v1/admin/crop-health/sources").json()["total"], 1)
        self.assertEqual(self.client.get("/api/v1/admin/crop-health/disease_cases").json()["records"][0]["expert_approval"], "rejected")


class ManualDiseaseSqliteTests(ManualDiseaseFlow, unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        folder = Path(temporary.name)
        self.prepare(f"sqlite:///{folder / 'manual.db'}", folder)


@unittest.skipUnless(os.getenv("TEST_POSTGRES_DATABASE_URL") and psycopg, "Set TEST_POSTGRES_DATABASE_URL for PostgreSQL coverage.")
class ManualDiseasePostgresTests(ManualDiseaseFlow, unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        url = os.environ["TEST_POSTGRES_DATABASE_URL"]
        raw = psycopg.connect(url, autocommit=True)
        self.addCleanup(raw.close)
        schema = "manual_test_" + uuid4().hex
        raw.execute(f"CREATE SCHEMA {schema}")
        self.addCleanup(lambda: raw.execute(f"DROP SCHEMA {schema} CASCADE"))
        params = dict(parse_qsl(urlsplit(url).query))
        params["options"] = f"-csearch_path={schema}"
        self.prepare(url.split("?", 1)[0] + "?" + urlencode(params), Path(temporary.name))


class SeedSafetyTests(unittest.TestCase):
    def test_hosted_seed_loading_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "local-only"):
            replace(settings, env="prod", load_demo_seed=True)
        with patch.dict(os.environ, {"VERCEL": "1"}), self.assertRaisesRegex(ValueError, "local-only"):
            Settings(env="test", load_demo_seed=True)


if __name__ == "__main__":
    unittest.main()
