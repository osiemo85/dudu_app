"""Account editing and logout must preserve identity and revoke access."""
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


class ProfileTests(unittest.TestCase):
    def setUp(self):
        folder = TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.enterContext(patch(
            'app.data_access.database.settings',
            replace(settings, database_url=f"sqlite:///{Path(folder.name) / 'profile.db'}"),
        ))
        self.client = self.enterContext(TestClient(app))
        self.credentials = {'email': 'profile@example.com', 'password': 'testing-profile-123'}

    def register(self):
        response = self.client.post('/api/v1/auth/register', json={
            **self.credentials, 'name': 'Farmer',
            'password_confirmation': self.credentials['password'],
        })
        self.assertEqual(response.status_code, 201)
        return response.json()

    def test_edit_requires_authentication_and_valid_name(self):
        self.assertEqual(self.client.patch('/api/v1/auth/me', json={'name': 'Other'}).status_code, 401)
        self.register()
        for name in ['', '   ', 'a' * 121]:
            self.assertEqual(self.client.patch('/api/v1/auth/me', json={'name': name}).status_code, 422)
        self.assertEqual(self.client.get('/api/v1/auth/me').json()['name'], 'Farmer')

    def test_edit_preserves_identity_and_survives_logout_and_login(self):
        original = self.register()
        updated = self.client.patch('/api/v1/auth/me', json={
            'name': '  Updated   Farmer  ', 'email': 'other@example.com', 'role': 'admin',
        })
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.headers['cache-control'], 'no-store')
        self.assertEqual(updated.json(), {**original, 'name': 'Updated Farmer'})
        old_cookies = dict(self.client.cookies)
        self.assertEqual(self.client.post('/api/v1/auth/logout').status_code, 204)
        self.assertEqual(self.client.get('/api/v1/auth/me').status_code, 401)
        # Replaying the revoked cookie must not restore account access.
        self.client.cookies.update(old_cookies)
        self.assertEqual(self.client.get('/api/v1/auth/me').status_code, 401)
        self.client.cookies.clear()
        self.assertEqual(self.client.post('/api/v1/auth/login', json=self.credentials).status_code, 200)
        self.assertEqual(self.client.get('/api/v1/auth/me').json()['name'], 'Updated Farmer')

    def test_untrusted_origin_cannot_edit_or_logout(self):
        self.register()
        headers = {'Origin': 'https://untrusted.invalid'}
        self.assertEqual(self.client.patch('/api/v1/auth/me', json={'name': 'Other'}, headers=headers).status_code, 403)
        self.assertEqual(self.client.post('/api/v1/auth/logout', headers=headers).status_code, 403)
        self.assertEqual(self.client.get('/api/v1/auth/me').json()['name'], 'Farmer')
