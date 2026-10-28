import base64
from dataclasses import replace
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from openai import AuthenticationError, AsyncOpenAI

from app.core.config import settings
from app.main import app
from app.services.disease_agent import AgentResult


# A synthetic one-pixel PNG, used only to check transport (not diagnosis quality).
IMAGE = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=")
CONTEXT = {"crop": "Tomato", "county": "Kiambu", "area": "Thika", "season": "Long rains"}
PAYLOAD = {
    "selected_disease_ids": [1], "confidence_level": "low",
    "confidence_explanation": "Possible visual match; requires expert review.",
    "next_actions": ["Ask an extension officer to confirm the cause."],
}

class DiseaseAnalysisTests(unittest.TestCase):
    def setUp(self) -> None:
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        database_settings = replace(settings, database_path=Path(directory.name) / "test.db", outbreak_evidence_dir=Path(directory.name) / "images")
        self.enterContext(patch("app.services.outbreak_recorder.settings", database_settings))
        self.enterContext(patch("app.services.admin_service.settings", database_settings))
        self.enterContext(patch("app.data_access.database.settings", database_settings))
        self.client = self.enterContext(TestClient(app))

    def identify(self, **data):
        return self.client.post(
            "/api/v1/disease/identify", data={**CONTEXT, **data},
            files={"image": ("test.png", IMAGE, "image/png")},
        )

    def test_no_provider_does_not_guess_from_photo(self) -> None:
        with patch("app.services.disease_agent._client", return_value=None):
            response = self.identify()
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "needs_clarification")
        self.assertEqual(body["candidates"], [])
        self.assertEqual(body["analysis"]["status"], "unavailable")
        self.assertFalse(body["analysis"]["image_analyzed"])
        self.assertIn("No AI provider", body["analysis"]["message"])

    def test_auth_error_is_visible_without_leaking_provider_body(self) -> None:
        error = AuthenticationError(
            "Incorrect API key: secret-test-value",
            response=httpx.Response(401, request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions")),
            body={"code": "invalid_api_key"},
        )
        with patch("app.services.disease_engine.run_agent", side_effect=error), self.assertLogs("app.services.disease_engine", level="WARNING") as logs:
            response = self.identify(symptoms="brown spots with concentric rings on lower leaves")
        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(body["status"], "possible_matches")
        self.assertEqual(body["engine"], "deterministic_demo")
        self.assertIn("rejected", body["analysis"]["message"])
        self.assertFalse(body["analysis"]["image_analyzed"])
        self.assertNotIn("secret-test-value", response.text + str(logs.output))
        self.assertIn("401", str(logs.output))

    def test_ai_no_match_is_not_replaced_by_demo_disease(self) -> None:
        result = AgentResult(**{**PAYLOAD, "selected_disease_ids": []}, engine="openai_agent")
        with patch("app.services.disease_engine.run_agent", return_value=result):
            body = self.identify().json()
        self.assertEqual(body["status"], "needs_clarification")
        self.assertEqual(body["candidates"], [])
        self.assertTrue(body["analysis"]["image_analyzed"])

    def test_unknown_symptoms_do_not_return_zero_score_match(self) -> None:
        with patch("app.services.disease_agent._client", return_value=None):
            body = self.identify(symptoms="xyz").json()
        self.assertEqual(body["status"], "needs_clarification")
        self.assertEqual(body["candidates"], [])

    def test_nearby_agrovets_are_limited_to_selected_area_and_diseases(self) -> None:
        response = self.client.get(
            "/api/v1/disease/nearby-agrovets",
            params=[("county", "Kiambu"), ("area", "Thika"), ("disease_id", "1"), ("disease_id", "2")],
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["county"], "Kiambu")
        self.assertEqual(body["area"], "Thika")
        self.assertEqual({entry["disease_id"] for entry in body["agrovets"]}, {1, 2})
        self.assertTrue(all(entry["evidence_status"] == "simulated" for entry in body["agrovets"]))
        self.assertIn("does not verify distance", body["notice"])

    def test_nearby_agrovets_require_disease_ids(self) -> None:
        response = self.client.get("/api/v1/disease/nearby-agrovets", params={"county": "Kiambu", "area": "Thika"})
        self.assertEqual(response.status_code, 422)

    def test_context_is_resolved_before_calling_provider(self) -> None:
        with patch("app.services.disease_engine.run_agent") as agent:
            body = self.identify(season="").json()
        self.assertEqual(body["clarification"]["field"], "season")
        self.assertEqual(body["analysis"]["status"], "not_attempted")
        agent.assert_not_called()

    def sdk_provider(self, requests, *, selected_ids=None, fail_report=False):
        selected_ids = [1] if selected_ids is None else selected_ids

        def provider(request):
            payload = json.loads(request.content)
            requests.append(payload)
            self.assertEqual(request.url.path, "/v1/responses")
            index = len(requests)
            if index == 1:
                output = [{"type": "function_call", "id": "fc_1", "call_id": "call_1",
                           "name": "lookup_disease_candidates",
                           "arguments": json.dumps({"symptoms": "brown spots concentric rings", "affected_part": "leaf"})}]
            elif index == 2:
                output = [{"type": "function_call", "id": f"fc_{i}", "call_id": f"call_{i}",
                           "name": name, "arguments": json.dumps({"disease_ids": [1]})}
                          for i, name in enumerate(["lookup_local_outbreak_history", "lookup_supported_treatments"], 2)]
            else:
                if index > 3 and fail_report:
                    return httpx.Response(401, json={"error": {"message": "secret-test-value", "type": "authentication_error"}})
                final = ({**PAYLOAD, "selected_disease_ids": selected_ids, "image_observations": ["Brown leaf spots"]}
                         if index == 3 else {"summary": "Possible leaf disease; needs field review.",
                         "evidence_gaps": ["Symptom onset is unknown."], "follow_up_questions": ["When did symptoms start?"],
                         "review_priority": "routine", "priority_reason": "Extent is not known."})
                output = [{"type": "message", "id": f"msg_{index}", "role": "assistant", "status": "completed",
                           "content": [{"type": "output_text", "text": json.dumps(final), "annotations": []}]}]
            return httpx.Response(200, json={
                "id": f"resp_{index}", "object": "response", "created_at": 0, "status": "completed",
                "model": "gpt-4.1-mini", "output": output, "parallel_tool_calls": True,
                "tool_choice": "auto", "tools": [], "metadata": {}, "error": None, "incomplete_details": None,
            })
        return provider

    def sdk_identify(self, *, selected_ids=None, fail_report=False, **data):
        requests = []
        client = AsyncOpenAI(api_key="test-key", max_retries=0,
                             http_client=httpx.AsyncClient(transport=httpx.MockTransport(
                                 self.sdk_provider(requests, selected_ids=selected_ids, fail_report=fail_report))))
        with patch("app.services.disease_agent._client", return_value=client):
            response = self.identify(**data)
        self.assertEqual(response.status_code, 200)
        return response.json(), requests

    def cases(self):
        return self.client.get("/api/v1/admin/crop-health/disease_cases").json()["records"]

    def test_multipart_photo_reaches_responses_sdk_and_completes_tool_loop(self) -> None:
        body, requests = self.sdk_identify(latitude=-1.023456, longitude=37.123456)
        self.assertEqual(body["engine"], "openai_agent")
        self.assertEqual(body["analysis"]["status"], "completed")
        self.assertTrue(body["analysis"]["image_analyzed"])
        self.assertTrue(body["candidates"])
        self.assertEqual(len(requests), 3)
        image_part = requests[0]["input"][0]["content"][1]
        self.assertEqual(image_part["type"], "input_image")
        self.assertEqual(base64.b64decode(image_part["image_url"].split(",", 1)[1]), IMAGE)
        self.assertNotIn("37.123456", json.dumps(requests))
        self.assertTrue(all(payload["store"] is False for payload in requests))
        self.assertEqual(requests[0]["text"]["format"]["type"], "json_schema")
        self.assertEqual(self.cases(), [])
        self.assertEqual(body["recording"]["status"], "not_requested")

    def test_consent_saves_full_history_and_two_distinct_agent_runs(self) -> None:
        body, requests = self.sdk_identify(save_for_expert_review="true", symptoms="brown leaf spots")
        self.assertEqual(len(requests), 4)
        self.assertEqual(body["recording"]["status"], "saved")
        case = self.cases()[0]
        runs = json.loads(case["agent_runs_json"])
        self.assertEqual(len({run["agent_id"] for run in runs}), 2)
        self.assertEqual(len({run["run_id"] for run in runs}), 2)
        self.assertTrue(all(run["status"] == "completed" for run in runs))
        self.assertEqual(case["workflow_id"], body["workflow_id"])
        self.assertEqual(case["expert_approval"], "pending")
        snapshot = json.loads(case["result_json"])
        self.assertTrue(snapshot["sources"])
        self.assertTrue(snapshot["confidence"])
        self.assertTrue(snapshot["officer_report"]["evidence_gaps"])
        self.assertEqual(json.loads(case["observation_json"])["symptoms"], "brown leaf spots")
        image_response = self.client.get(f"/api/v1/admin/crop-health/disease_cases/{case['id']}/image")
        self.assertEqual(image_response.content, IMAGE)
        from app.data_access import disease_repository as repository
        self.assertNotIn(case["outbreak_id"], [row["id"] for row in repository.get_outbreak_context("Kiambu", [1])])
        reviewed = self.client.put(f"/api/v1/admin/crop-health/disease_cases/{case['id']}", json={"values": {
            "expert_approval": "approved", "expert_review_note": "Reviewed test record", "result_json": "tampered"}})
        self.assertEqual(reviewed.status_code, 200)
        self.assertEqual(reviewed.json()["result_json"], case["result_json"])
        self.assertIn(case["outbreak_id"], [row["id"] for row in repository.get_outbreak_context("Kiambu", [1])])
        from app.data_access.database import initialize_database
        initialize_database()
        self.assertEqual(self.cases()[0]["result_json"], case["result_json"])
        rejected = self.client.put(f"/api/v1/admin/crop-health/outbreaks/{case['outbreak_id']}",
                                   json={"values": {"expert_approval": "rejected"}})
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(self.cases()[0]["expert_approval"], "rejected")
        self.assertNotIn(case["outbreak_id"], [row["id"] for row in repository.get_outbreak_context("Kiambu", [1])])
        second, _ = self.sdk_identify(save_for_expert_review="true")
        self.assertEqual(second["recording"]["status"], "saved")
        self.assertEqual(len(self.cases()), 2)
        self.assertNotEqual(second["workflow_id"], body["workflow_id"])
        self.assertNotEqual(second["agent_runs"][0]["run_id"], runs[0]["run_id"])

    def test_reporting_failure_preserves_identification_and_history(self) -> None:
        with self.assertLogs("openai.agents", level="WARNING") as logs:
            body, _ = self.sdk_identify(save_for_expert_review="true", fail_report=True)
        self.assertEqual(body["analysis"]["status"], "completed")
        self.assertEqual(body["recording"]["status"], "saved")
        self.assertEqual(body["agent_runs"][1]["status"], "failed")
        self.assertIsNone(body["officer_report"])
        self.assertNotIn("secret-test-value", json.dumps(body) + json.dumps(self.cases()) + str(logs.output))

    def test_unsupported_ids_cannot_create_outbreak(self) -> None:
        body, _ = self.sdk_identify(save_for_expert_review="true", selected_ids=[999])
        self.assertEqual(body["analysis"]["status"], "unavailable")
        self.assertEqual(body["candidates"], [])
        self.assertIsNone(self.cases()[0]["outbreak_id"])
        self.assertEqual(body["agent_runs"][0]["status"], "failed")

    def test_no_match_is_saved_as_clarification_without_outbreak(self) -> None:
        body, _ = self.sdk_identify(save_for_expert_review="true", selected_ids=[])
        self.assertEqual(body["status"], "needs_clarification")
        self.assertEqual(body["analysis"]["status"], "completed")
        self.assertEqual(body["recording"]["status"], "saved")
        self.assertIsNone(self.cases()[0]["outbreak_id"])

    def test_storage_failure_is_visible_and_does_not_erase_analysis(self) -> None:
        with patch("app.data_access.disease_repository.save_disease_case", side_effect=OSError("disk full")):
            body, _ = self.sdk_identify(save_for_expert_review="true")
        self.assertEqual(body["analysis"]["status"], "completed")
        self.assertEqual(body["recording"]["status"], "failed")
        self.assertEqual(self.cases(), [])
        from app.services.outbreak_recorder import settings as test_settings
        self.assertEqual(list(test_settings.outbreak_evidence_dir.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
