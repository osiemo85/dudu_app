import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.core.config import settings
from app.main import app
from app.data_access.database import database


class UserPlanTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.enterContext(patch('app.data_access.database.settings', replace(settings, database_path=Path(directory.name) / 'test.db')))
        self.client = self.enterContext(TestClient(app))

    def register(self, email):
        return self.client.post('/api/v1/auth/register', json={'email': email, 'password': 'correct-password'})

    def test_save_snapshot_and_notes_are_private_and_persist_across_login(self):
        self.assertEqual(self.client.get('/api/v1/saved-plans').status_code, 401)
        response = self.register('ONE@example.com')
        self.assertEqual(response.status_code, 201)
        self.assertIn('HttpOnly', response.headers['set-cookie'])
        with database() as connection:
            self.assertNotIn('correct-password', connection.execute('SELECT password_hash FROM users').fetchone()[0])
        params = {'county': 'Kiambu', 'area': 'Thika', 'season': 'Long rains'}
        plan = self.client.get('/api/v1/planting/crops/1/details', params=params).json()['plans'][0]
        saved = self.client.post('/api/v1/saved-plans', json={**params, 'crop_id': 1, 'plan_id': plan['id']})
        self.assertEqual(saved.status_code, 201)
        body = saved.json(); plan_id = body['id']
        self.assertEqual(body['snapshot']['crop'], 'Maize')
        self.assertEqual(body['snapshot']['plan']['stages'][0]['stage_name'], 'Land preparation')
        self.assertIsNone(body['snapshot']['location']['coordinates'])
        self.assertEqual(body['snapshot']['plan']['weeding_count'], 2)
        self.assertEqual(body['snapshot']['plan']['weather']['rainy_months'], 4)
        self.assertTrue(any(stage['inputs'] for stage in body['snapshot']['plan']['stages']))
        self.assertEqual(self.client.post(f'/api/v1/saved-plans/{plan_id}/notes', json={'category': 'disease', 'body': 'Yellow leaves observed', 'observed_on': '2026-04-10'}).status_code, 201)
        self.assertEqual(self.client.post(f'/api/v1/saved-plans/{plan_id}/notes', json={'category': 'harvest', 'body': 'Harvested'}).status_code, 201)
        self.assertEqual(self.client.post(f'/api/v1/saved-plans/{plan_id}/notes', json={'category': 'bad', 'body': 'note'}).status_code, 422)
        with database() as connection:
            connection.execute("UPDATE management_stages SET description='Changed source' WHERE management_plan_id=?", (plan['id'],))
        self.assertEqual(self.client.post('/api/v1/auth/logout').status_code, 204)
        self.assertEqual(self.client.get(f'/api/v1/saved-plans/{plan_id}').status_code, 401)
        self.assertEqual(self.register('two@example.com').status_code, 201)
        self.assertEqual(self.client.get('/api/v1/saved-plans').json(), [])
        self.assertEqual(self.client.get(f'/api/v1/saved-plans/{plan_id}').status_code, 404)
        self.assertEqual(self.client.post(f'/api/v1/saved-plans/{plan_id}/notes', json={'category': 'planting', 'body': 'no'}).status_code, 404)
        self.client.post('/api/v1/auth/logout')
        self.assertEqual(self.client.post('/api/v1/auth/login', json={'email': 'one@example.com', 'password': 'wrong-password'}).status_code, 401)
        self.assertEqual(self.client.post('/api/v1/auth/login', json={'email': 'one@example.com', 'password': 'correct-password'}).status_code, 200)
        detail = self.client.get(f'/api/v1/saved-plans/{plan_id}').json()
        self.assertEqual(len(detail['notes']), 2)
        self.assertNotEqual(detail['snapshot']['plan']['stages'][0]['description'], 'Changed source')
        self.assertEqual({n['category'] for n in detail['notes']}, {'disease', 'harvest'})
        self.assertEqual(self.client.post('/api/v1/saved-plans', json={**params, 'season': 'Short rains', 'crop_id': 1, 'plan_id': plan['id']}).status_code, 404)

    def test_older_saved_snapshot_remains_readable(self):
        import json
        self.register('old@example.com')
        params = {'county': 'Kiambu', 'area': 'Thika', 'season': 'Long rains'}
        plan = self.client.get('/api/v1/planting/crops/1/details', params=params).json()['plans'][0]
        saved = self.client.post('/api/v1/saved-plans', json={**params, 'crop_id': 1, 'plan_id': plan['id']}).json()
        with database() as connection:
            snapshot = saved['snapshot']
            for key in ('rain_needed_months', 'rain_requirement_notes', 'weeding_count', 'fertility_notes', 'weather'):
                snapshot['plan'].pop(key, None)
            for stage in snapshot['plan']['stages']:
                for key in ('start_day_after_planting', 'end_day_after_planting', 'timing_notes', 'activity_type', 'weeding_round', 'inputs', 'treatments'):
                    stage.pop(key, None)
            connection.execute('UPDATE saved_plans SET snapshot_json=? WHERE id=?', (json.dumps(snapshot), saved['id']))
        detail = self.client.get(f"/api/v1/saved-plans/{saved['id']}")
        self.assertEqual(detail.status_code, 200)
        self.assertIsNone(detail.json()['snapshot']['plan']['rain_needed_months'])
        self.assertEqual(detail.json()['snapshot']['plan']['stages'][0]['inputs'], [])

    def test_duplicate_account_and_disallowed_origin(self):
        self.assertEqual(self.register('one@example.com').status_code, 201)
        self.assertEqual(self.register('ONE@example.com').status_code, 409)
        self.assertEqual(self.client.post('/api/v1/auth/logout', headers={'Origin': 'https://evil.example'}).status_code, 403)
