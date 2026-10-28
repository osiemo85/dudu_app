import json
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, patch
from types import SimpleNamespace

import httpx
from fastapi.testclient import TestClient
from openai import AsyncOpenAI

from app.core.config import settings
from app.data_access.database import database, initialize_database
from app.main import app


class PlantingApiTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        test_settings = replace(settings, database_path=Path(directory.name) / "test.db", openai_api_key="test-key")
        self.enterContext(patch("app.data_access.database.settings", test_settings))
        self.enterContext(patch("app.services.planting_agent.settings", test_settings))
        self.client = self.enterContext(TestClient(app))

    def test_agent_uses_both_tools_and_returns_ranked_crops(self):
        requests = []
        def provider(request):
            requests.append(json.loads(request.content))
            index = len(requests)
            if index == 1:
                output = [{"type": "function_call", "id": "fc1", "call_id": "c1", "name": "find_area_crops", "arguments": "{}"}]
            elif index == 2:
                output = [{"type": "function_call", "id": f"fc{i}", "call_id": f"c{i}", "name": "check_crop_forecast", "arguments": json.dumps({"crop_id": crop_id})} for i, crop_id in enumerate([1, 2, 3], 2)]
            else:
                result = {"crops": [{"crop_id": 2, "suitability": "strong", "explanation": "The simulated scenario has four rainy months and beans need three."}, {"crop_id": 1, "suitability": "conditional", "explanation": "The simulated scenario has four rainy months and maize needs four."}]}
                output = [{"type": "message", "id": "msg", "role": "assistant", "status": "completed", "content": [{"type": "output_text", "text": json.dumps(result), "annotations": []}]}]
            return httpx.Response(200, json={"id": f"resp_{index}", "object": "response", "created_at": 0, "status": "completed", "model": "gpt-4.1-mini", "output": output, "parallel_tool_calls": True, "tool_choice": "auto", "tools": [], "metadata": {}, "error": None, "incomplete_details": None, "usage": {"input_tokens": 10, "output_tokens": 10, "total_tokens": 20, "input_tokens_details": {"cached_tokens": 0}, "output_tokens_details": {"reasoning_tokens": 0}}})
        client = AsyncOpenAI(api_key="test-key", max_retries=0, http_client=httpx.AsyncClient(transport=httpx.MockTransport(provider)))
        with patch("app.services.planting_agent._client", return_value=client):
            body = self.client.post("/api/v1/planting/recommend", json={"county": "Kiambu", "area": "Thika", "season": "Long rains"}).json()
        self.assertEqual(body["status"], "recommendations")
        self.assertEqual([x["crop"] for x in body["recommendations"]], ["Bean", "Maize"])
        self.assertEqual(len(requests), 3)
        self.assertIn("four rainy months", body["recommendations"][0]["rationale"][0])
        self.assertFalse(body["weather_context"]["live_forecast"])
        self.assertNotIn("latitude", json.dumps(requests))

    def test_context_and_missing_key_produce_clarification(self):
        with patch("app.services.planting_agent._client") as client:
            body = self.client.post("/api/v1/planting/recommend", json={"county": "Kiambu"}).json()
            self.assertEqual(body["clarification"]["field"], "location")
            client.assert_not_called()
        with patch("app.services.planting_agent.settings", replace(settings, openai_api_key=None)):
            body = self.client.post("/api/v1/planting/recommend", json={"county": "Kiambu", "area": "Thika", "season": "Long rains"}).json()
            self.assertEqual(body["clarification"]["field"], "agent_unavailable")
            self.assertEqual(body["recommendations"], [])

    def test_rejects_model_output_without_tool_evidence(self):
        fake = SimpleNamespace(final_output={"crops": [{"crop_id": 1, "suitability": "strong", "explanation": "Invented"}]})
        with patch("app.services.planting_agent.Runner.run", new=AsyncMock(return_value=fake)):
            body = self.client.post("/api/v1/planting/recommend", json={"county": "Kiambu", "area": "Thika", "season": "Long rains"}).json()
        self.assertEqual(body["status"], "needs_clarification")
        self.assertEqual(body["recommendations"], [])

    def test_repair_legacy_rain_sources_without_overwriting_edits(self):
        with database() as connection:
            connection.execute("DELETE FROM schema_migrations WHERE name = 'planting_rain_fixture_sources_v1'")
            connection.execute("UPDATE crops SET rain_needs_source_id = NULL WHERE name IN ('Maize', 'Bean')")
            connection.execute("UPDATE crops SET rain_needed_months = 6, rain_needs_notes = 'Contributor data' WHERE name = 'Bean'")
        initialize_database()
        with database() as connection:
            maize = connection.execute("SELECT rain_needs_source_id FROM crops WHERE name = 'Maize'").fetchone()[0]
            bean = connection.execute("SELECT rain_needed_months, rain_needs_notes, rain_needs_source_id FROM crops WHERE name = 'Bean'").fetchone()
            self.assertIsNotNone(maize)
            self.assertEqual(tuple(bean), (6, 'Contributor data', None))
            connection.execute("UPDATE crops SET rain_needs_source_id = NULL WHERE name = 'Maize'")
        initialize_database()
        with database() as connection:
            self.assertIsNone(connection.execute("SELECT rain_needs_source_id FROM crops WHERE name = 'Maize'").fetchone()[0])

    def test_planting_admin_exposes_supplier_tables_and_editing(self):
        for table in ("counties", "areas", "varieties", "area_season_varieties", "management_plans", "management_stages", "inputs", "stage_inputs", "suppliers", "supplier_varieties", "area_season_climate"):
            response = self.client.get(f"/api/v1/admin/planting/{table}")
            self.assertEqual(response.status_code, 200, table)
        listings = self.client.get("/api/v1/admin/planting/supplier_varieties").json()
        self.assertTrue(listings["records"])
        listing = listings["records"][0]
        response = self.client.put(f"/api/v1/admin/planting/supplier_varieties/{listing['id']}", json={"values": {"notes": "Edited demo listing"}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["notes"], "Edited demo listing")
        self.assertEqual(self.client.get("/api/v1/admin/crop-health/supplier_varieties").status_code, 404)

    def test_crop_details_match_area_season_and_variety(self):
        params = {"county": "Kiambu", "area": "Thika", "season": "Long rains"}
        for crop_id in (1, 2, 3):
            response = self.client.get(f"/api/v1/planting/crops/{crop_id}/details", params=params)
            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertEqual(body["location"]["label"], "Thika, Kiambu")
            self.assertTrue(body["plans"])
            self.assertTrue(body["suppliers"])
            self.assertTrue(all(plan["source"]["evidence_status"] == "simulated" for plan in body["plans"]))
            self.assertTrue(all([stage["stage_name"] for stage in plan["stages"]] == ["Land preparation", "Planting", "Establishment", "Crop management", "Harvest"] for plan in body["plans"]))
            self.assertTrue(all(supplier["price"] is None for supplier in body["suppliers"]))
        other = self.client.get("/api/v1/planting/crops/1/details", params={**params, "season": "Short rains"}).json()
        self.assertEqual(other["plans"], [])
        self.assertEqual(other["suppliers"], [])
        self.assertEqual(self.client.get("/api/v1/planting/crops/1/details", params={**params, "area": "Njoro"}).status_code, 404)

    def test_supporting_option_endpoints(self):
        self.assertEqual(self.client.get("/api/v1/planting/locations").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/planting/seasons/Kiambu").status_code, 200)
