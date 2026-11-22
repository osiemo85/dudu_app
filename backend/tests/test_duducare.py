import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.core.config import settings
from app.data_access.database import initialize_database
from app.main import app


@unittest.skipUnless(settings.seed_path.is_file(), "Optional local fixtures are not present; run test_manual_disease.py for seed-free coverage.")
class DuducareTests(unittest.TestCase):
    def setUp(self):
        folder = TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.enterContext(patch('app.data_access.database.settings', replace(settings, load_demo_seed=True, database_url=f"sqlite:///{Path(folder.name) / 'demo.db'}")))
        initialize_database()
        self.client = TestClient(app)

    def test_chat_context_safety_and_provenance(self):
        no_context = self.client.post('/api/v1/chat', json={'message': 'What should I plant?'}).json()
        self.assertEqual(no_context['status'], 'needs_clarification')
        self.assertEqual(no_context['location']['label'], 'Unknown')
        missing_season = self.client.post('/api/v1/chat', json={'message': 'What should I plant?', 'county': 'Kiambu', 'area': 'Thika'}).json()
        self.assertIn('season', missing_season['reply'])
        county_only = self.client.post('/api/v1/chat', json={'message': 'What should I plant?', 'county': 'Kiambu'}).json()
        self.assertEqual(county_only['location']['label'], 'Unknown')
        self.assertIsNone(county_only['location']['area'])
        context = {'county': 'Kiambu', 'area': 'Thika', 'season': 'Long rains'}
        for message in ['What should I plant?', 'Which pesticide dose should I mix?', 'Will it rain tomorrow?', 'yellow leaves']:
            reply = self.client.post('/api/v1/chat', json={'message': message, **context}).json()
            self.assertEqual(reply['engine'], 'scripted_local_demo')
            self.assertEqual(reply['sources'][0]['evidence_status'], 'simulated')
            self.assertTrue(reply['disclaimer'])
            self.assertEqual(reply['confidence']['level'], 'low')
        chemical = self.client.post('/api/v1/chat', json={'message': 'What pesticide dose for yellow leaves?'}).json()
        self.assertIn('cannot select a chemical', chemical['reply'])
        self.assertEqual(self.client.post('/api/v1/chat', json={'message': '   '}).status_code, 422)
        self.assertEqual(self.client.post('/api/v1/chat', json={'message': 'x' * 2001}).status_code, 422)

    def test_both_modules_and_local_planting_need_no_provider(self):
        for path in ['/api/v1/disease/locations', '/api/v1/planting/locations', '/api/v1/planting/crops']:
            self.assertTrue(self.client.get(path).json())
        result = self.client.post('/api/v1/planting/demo-recommend', json={'county': 'Machakos', 'area': 'Kangundo', 'season': 'Short rains', 'irrigation': 'none'}).json()
        self.assertEqual(result['status'], 'recommendations')
        self.assertTrue(result['recommendations'])
        self.assertFalse(result['weather_context']['live_forecast'])
        self.assertIsNone(result['location']['coordinates'])
        correction = self.client.post('/api/v1/planting/demo-recommend', json={'county': 'Machakos'}).json()
        self.assertEqual(correction['status'], 'needs_clarification')
        with patch('app.services.disease_agent.settings', replace(settings, openai_api_key=None)):
            crop = self.client.post('/api/v1/disease/identify', data={'crop': 'Tomato', 'symptoms': 'brown spots with concentric rings on lower leaves', 'county': 'Kiambu', 'area': 'Thika', 'season': 'Long rains'}).json()
        self.assertIn(crop['status'], ['possible_matches', 'needs_clarification'])
        self.assertTrue(crop['disclaimer'])

    def test_saved_plans_require_ownership_and_are_not_cached(self):
        self.assertEqual(self.client.get('/api/v1/saved-plans').status_code, 401)
        body = {'email': 'demo@example.com', 'name': 'Demo', 'password': 'demo-password-2026', 'password_confirmation': 'demo-password-2026'}
        self.assertEqual(self.client.post('/api/v1/auth/register', json=body).status_code, 201)
        details = self.client.get('/api/v1/planting/crops/1/details', params={'county': 'Kiambu', 'area': 'Thika', 'season': 'Long rains'}).json()
        plan = details['plans'][0]
        saved = self.client.post('/api/v1/saved-plans', json={'crop_id': 1, 'plan_id': plan['id'], 'county': 'Kiambu', 'area': 'Thika', 'season': 'Long rains'})
        self.assertEqual(saved.status_code, 201)
        self.assertEqual(saved.headers['cache-control'], 'no-store')
        plan_id = saved.json()['id']
        self.assertEqual(self.client.post(f'/api/v1/saved-plans/{plan_id}/notes', json={'category': 'other', 'body': 'First farmer observation'}).status_code, 201)
        outsider = TestClient(app)
        self.assertEqual(outsider.get(f'/api/v1/saved-plans/{plan_id}').status_code, 401)
        self.assertEqual(len(self.client.get(f'/api/v1/saved-plans/{plan_id}').json()['notes']), 1)
