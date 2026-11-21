import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

class AnimalHealthTests(unittest.TestCase):
    def setUp(self):
        tmp=TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        self.enterContext(patch('app.data_access.database.settings', replace(settings,database_url=f"sqlite:///{Path(tmp.name)/'test.db'}")))
        self.client=self.enterContext(TestClient(app))
        self.observation={'species':'cattle','symptoms':['cough'],'warning_check':True,'duration_days':2,'affected':1,'herd_size':3}

    def test_urgent_before_incomplete_intake_and_no_drugs(self):
        result=self.client.post('/api/v1/animal-health/assess',json={'warning_signs':['breathing_difficulty']}).json()
        self.assertEqual(result['status'],'urgent_referral')
        self.assertEqual(result['possibilities'],[])
        self.assertEqual(result['review_route'],'veterinarian')
        self.assertEqual(result['season']['label'],'Not applicable')

    def test_matching_clarification_swahili_and_validation(self):
        self.assertEqual(self.client.post('/api/v1/animal-health/assess',json={}).json()['status'],'needs_clarification')
        photo=self.client.post('/api/v1/animal-health/assess',json={'photo_attached':True,'warning_check':True,'species':'goat'}).json()
        self.assertEqual(photo['status'],'needs_clarification')
        result=self.client.post('/api/v1/animal-health/assess',json={**self.observation,'language':'sw'}).json()
        self.assertEqual(result['status'],'possible_matches')
        self.assertIn('kupumua',result['possibilities'][0]['name'])
        self.assertEqual(result['sources'][0]['evidence_status'],'simulated')
        self.assertEqual(self.client.post('/api/v1/animal-health/assess',json={**self.observation,'affected':4}).status_code,422)
        self.assertEqual(self.client.post('/api/v1/animal-health/assess',json={'species':'dog'}).status_code,422)

    def register(self, email):
        return self.client.post('/api/v1/auth/register',json={'name':'Farmer','email':email,'password':'testing123','password_confirmation':'testing123'})

    def test_consent_owner_history_profile_and_logout(self):
        self.assertEqual(self.client.get('/api/v1/animal-health/cases').status_code,401)
        self.assertEqual(self.register('first@example.com').status_code,201)
        self.assertEqual(self.client.post('/api/v1/animal-health/cases',json={'observation':self.observation,'consent':False}).status_code,400)
        saved=self.client.post('/api/v1/animal-health/cases',json={'observation':self.observation,'consent':True})
        self.assertEqual(saved.status_code,201)
        self.assertEqual(saved.headers['cache-control'],'no-store')
        case_id=saved.json()['id']
        profile=self.client.patch('/api/v1/auth/me',json={'name':'Updated farmer'})
        self.assertEqual(profile.json()['name'],'Updated farmer')
        self.assertEqual(self.client.patch('/api/v1/auth/me',json={'name':'  '}).status_code,422)
        self.assertEqual(self.client.post('/api/v1/auth/logout').status_code,204)
        self.assertEqual(self.client.get('/api/v1/auth/me').status_code,401)
        self.register('second@example.com')
        self.assertEqual(self.client.get('/api/v1/animal-health/cases').json(),[])
        self.assertEqual(self.client.get(f'/api/v1/animal-health/cases/{case_id}').status_code,404)
