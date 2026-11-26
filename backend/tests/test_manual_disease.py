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
                "affected_part": "leaf", "symptoms": "brown spots with concentric rings", **changes}
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
        parts = self.client.get("/api/v1/disease/plant-parts").json()
        self.assertIn("leaf", parts)
        self.assertIn("tuber flesh", parts)
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
        wrong_part = self.identify(affected_part="stem")
        self.assertEqual(wrong_part["status"], "needs_clarification")
        self.assertEqual(wrong_part["candidates"], [])
        missing_part = self.identify(affected_part="")
        self.assertEqual(missing_part["clarification"]["field"], "affected_part")
        invalid = self.client.post("/api/v1/admin/crop-health/disease_symptoms", json={"values": {
            "disease_id": disease["id"], "plant_part": "Fruits", "symptom": "brown patches", "weight": 1,
        }})
        self.assertEqual(invalid.status_code, 422)

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

    def test_expert_corrects_disease_and_case_directory_uses_reviewed_choice(self):
        source, original = self.enter_guide_records()
        corrected = self.add("diseases", crop="Tomato", common_name="Other tomato test cause",
                             scientific_name=None, summary="Fictional review correction.",
                             source_id=str(source["id"]), evidence_status="simulated")
        self.add("agrovets", disease_id=str(corrected["id"]), name="Corrected cause test shop",
                 county="Kiambu", area="Thika", address="Fictional", phone_number="Not a contact",
                 treatment_name="Referral discussion only", indicative_cost_kes="Unknown",
                 source_id=str(source["id"]), evidence_status="simulated")
        self.add("agrovets", disease_id=str(corrected["id"]), name="Other area test shop",
                 county="Kiambu", area="Ruiru", address="Fictional", phone_number="Not a contact",
                 treatment_name="Referral discussion only", indicative_cost_kes="Unknown",
                 source_id=str(source["id"]), evidence_status="simulated")
        new_drug_shop = self.add("agrovets", disease_id=str(original["id"]), name="Drug listing test shop",
                                 county="Kiambu", area="Juja", address="Fictional", phone_number="Not a contact",
                                 treatment_name="Initial service", indicative_cost_kes="Unknown",
                                 source_id=str(source["id"]), evidence_status="simulated")
        self.add("agrovet_drugs", agrovet_id=str(new_drug_shop["id"]), disease_id=str(corrected["id"]),
                 drug_name="Fictional product for corrected cause", availability_status="reported_available")
        case_id = self.identify(save_for_expert_review="true")["recording"]["case_id"]
        pending_directory = self.client.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets")
        self.assertEqual(pending_directory.status_code, 409)
        self.assertEqual(self.client.get(f"/api/v1/disease/cases/{case_id}/agrovet-locations").status_code, 409)
        endpoint = f"/api/v1/admin/crop-health/disease_cases/{case_id}"
        missing = self.client.put(endpoint, json={"values": {"expert_approval": "approved", "expert_review_note": "Reviewed."}})
        self.assertEqual(missing.status_code, 422)
        wrong_crop = self.add("diseases", crop="Maize", common_name="Maize test cause",
                              scientific_name=None, summary="Fictional.", source_id=str(source["id"]), evidence_status="simulated")
        invalid = self.client.put(endpoint, json={"values": {"reviewed_disease_id": wrong_crop["id"], "expert_review_note": "Correction."}})
        self.assertEqual(invalid.status_code, 422)
        approved = self.client.put(endpoint, json={"values": {"expert_approval": "approved",
            "reviewed_disease_id": corrected["id"], "expert_review_note": "Original suggestion was unsupported; reviewed this alternative."}})
        self.assertEqual(approved.status_code, 200, approved.text)
        row = self.client.get("/api/v1/admin/crop-health/disease_cases").json()["records"][0]
        self.assertEqual(row["identified_disease"], corrected["common_name"])
        self.assertEqual(row["ai_disease_name"], original["common_name"])
        case = self.client.get(f"/api/v1/disease/cases/{case_id}").json()
        self.assertEqual(case["reviewed_disease_name"], corrected["common_name"])
        self.assertEqual(case["possible_matches"], [original["common_name"]])
        with database() as connection:
            outbreak = connection.execute("SELECT disease_id FROM outbreaks WHERE id = (SELECT outbreak_id FROM disease_cases WHERE id = ?)", (case_id,)).fetchone()
        if outbreak:
            self.assertEqual(outbreak["disease_id"], corrected["id"])
        nearby = self.client.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets",
                                 params={"county": "Kiambu", "area": "Thika"})
        self.assertEqual(nearby.status_code, 200, nearby.text)
        self.assertEqual([shop["name"] for shop in nearby.json()["agrovets"]], ["Corrected cause test shop"])
        locations = self.client.get(f"/api/v1/disease/cases/{case_id}/agrovet-locations")
        self.assertEqual(locations.status_code, 200, locations.text)
        self.assertEqual(locations.json(), [{"county": "Kiambu", "area": "Juja"}, {"county": "Kiambu", "area": "Ruiru"}, {"county": "Kiambu", "area": "Thika"}])
        other_area = self.client.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets",
                                     params={"county": "Kiambu", "area": "Ruiru"})
        self.assertEqual(other_area.status_code, 200, other_area.text)
        self.assertEqual([shop["name"] for shop in other_area.json()["agrovets"]], ["Other area test shop"])
        drug_area = self.client.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets",
                                    params={"county": "Kiambu", "area": "Juja"})
        self.assertEqual(drug_area.status_code, 200, drug_area.text)
        self.assertEqual([shop["treatment_name"] for shop in drug_area.json()["agrovets"]],
                         ["Fictional product for corrected cause"])
        no_match = self.client.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets",
                                   params={"county": "Kiambu", "area": "No matching agrovet area"})
        self.assertEqual(no_match.status_code, 200, no_match.text)
        self.assertEqual(no_match.json()["agrovets"], [])
        with TestClient(app) as other:
            account = other.post("/api/v1/auth/register", json={"name": "Other farmer",
                "email": "other-farmer@example.com", "password": "different-password-123",
                "password_confirmation": "different-password-123"})
            self.assertEqual(account.status_code, 201)
            self.assertEqual(other.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets").status_code, 404)
            self.assertEqual(other.get(f"/api/v1/disease/cases/{case_id}/agrovet-locations").status_code, 404)

    def test_existing_agrovet_has_several_owner_managed_drug_disease_listings(self):
        source, first_disease = self.enter_guide_records()
        second_disease = self.add("diseases", crop="Tomato", common_name="Second tomato test cause",
                                  scientific_name=None, summary="Fictional.", source_id=str(source["id"]),
                                  evidence_status="simulated")
        shop = self.client.get("/api/v1/admin/crop-health/agrovets").json()["records"][0]
        duplicate_shop = self.client.post("/api/v1/admin/crop-health/agrovets", json={"values": {
            "disease_id": second_disease["id"], "name": shop["name"], "county": shop["county"],
            "area": shop["area"], "address": shop["address"], "phone_number": shop["phone_number"],
            "treatment_name": "another", "indicative_cost_kes": "Unknown", "source_id": source["id"],
            "evidence_status": "simulated"}})
        self.assertEqual(duplicate_shop.status_code, 409)
        with TestClient(app) as owner, TestClient(app) as stranger:
            registered = owner.post("/api/v1/auth/register", json={"name": "Test shop owner",
                "email": "shop-owner@example.com", "password": "shop-owner-test-123",
                "password_confirmation": "shop-owner-test-123"})
            self.assertEqual(registered.status_code, 201)
            assigned = self.client.put(f"/api/v1/admin/crop-health/agrovets/{shop['id']}",
                json={"values": {"owner_user_id": registered.json()["id"]}})
            self.assertEqual(assigned.status_code, 200, assigned.text)
            first = owner.post(f"/api/v1/agrovets/{shop['id']}/drugs", json={
                "disease_id": first_disease["id"], "drug_name": "Fictional product A"})
            second = owner.post(f"/api/v1/agrovets/{shop['id']}/drugs", json={
                "disease_id": second_disease["id"], "drug_name": "Fictional product B"})
            self.assertEqual(first.status_code, 201, first.text)
            self.assertEqual(second.status_code, 201, second.text)
            self.assertEqual(owner.post(f"/api/v1/agrovets/{shop['id']}/drugs", json={
                "disease_id": first_disease["id"], "drug_name": "Fictional product A"}).status_code, 409)
            self.assertEqual(owner.post(f"/api/v1/agrovets/{shop['id']}/drugs", json={
                "disease_id": first_disease["id"], "drug_name": "fictional product a"}).status_code, 409)
            mine = owner.get("/api/v1/agrovets/mine").json()
            self.assertEqual(len(mine), 1)
            self.assertEqual({drug["disease_id"] for drug in mine[0]["drugs"]}, {first_disease["id"], second_disease["id"]})
            admin_list = self.client.get("/api/v1/admin/crop-health/agrovet_drugs")
            self.assertEqual(admin_list.status_code, 200, admin_list.text)
            self.assertEqual(admin_list.json()["total"], 2)
            self.assertIn(shop["id"], [option["id"] for option in admin_list.json()["reference_options"]["agrovet_id"]])
            self.assertEqual(stranger.post(f"/api/v1/agrovets/{shop['id']}/drugs", json={
                "disease_id": first_disease["id"], "drug_name": "Unauthorised"}).status_code, 401)
            stranger_registration = stranger.post("/api/v1/auth/register", json={"name": "Unassigned shop user",
                "email": "unassigned-shop@example.com", "password": "unassigned-test-123",
                "password_confirmation": "unassigned-test-123"})
            self.assertEqual(stranger_registration.status_code, 201)
            self.assertEqual(stranger.post(f"/api/v1/agrovets/{shop['id']}/drugs", json={
                "disease_id": first_disease["id"], "drug_name": "Unauthorised"}).status_code, 404)
            unavailable = owner.put(f"/api/v1/agrovets/{shop['id']}/drugs/{second.json()['id']}", json={
                "disease_id": second_disease["id"], "drug_name": "Fictional product B",
                "availability_status": "reported_unavailable"})
            self.assertEqual(unavailable.status_code, 200, unavailable.text)
            hidden = self.client.get("/api/v1/disease/nearby-agrovets", params={
                "county": "Kiambu", "area": "Thika", "disease_id": second_disease["id"]}).json()
            self.assertEqual(hidden["agrovets"], [])
            restored = owner.put(f"/api/v1/agrovets/{shop['id']}/drugs/{second.json()['id']}", json={
                "disease_id": second_disease["id"], "drug_name": "Fictional product B",
                "availability_status": "reported_available"})
            self.assertEqual(restored.status_code, 200, restored.text)
            directory = self.client.get("/api/v1/disease/nearby-agrovets", params={
                "county": "Kiambu", "area": "Thika", "disease_id": second_disease["id"]}).json()
            self.assertEqual([item["treatment_name"] for item in directory["agrovets"]], ["Fictional product B"])
            self.assertEqual(directory["agrovets"][0]["evidence_status"], "awaiting_validation")
            case_id = self.identify(save_for_expert_review="true")["recording"]["case_id"]
            approved = self.client.put(f"/api/v1/admin/crop-health/disease_cases/{case_id}", json={"values": {
                "expert_approval": "approved", "reviewed_disease_id": second_disease["id"],
                "expert_review_note": "Fictional review for directory filtering test."}})
            self.assertEqual(approved.status_code, 200, approved.text)
            matched_areas = self.client.get(f"/api/v1/disease/cases/{case_id}/agrovet-locations")
            self.assertEqual(matched_areas.status_code, 200, matched_areas.text)
            self.assertEqual(matched_areas.json(), [{"county": "Kiambu", "area": "Thika"}])
            case_directory = self.client.get(f"/api/v1/disease/cases/{case_id}/nearby-agrovets",
                                             params={"county": "Kiambu", "area": "Thika"})
            self.assertEqual([item["treatment_name"] for item in case_directory.json()["agrovets"]], ["Fictional product B"])


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
