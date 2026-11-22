"""Participant privacy, persistence, retries, unread races and optional profile fields."""
import os
import sqlite3
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.parse import parse_qsl, urlencode, urlsplit
from uuid import uuid4
from fastapi.testclient import TestClient
from app.core.config import settings
from app.data_access.database import database, initialize_database, psycopg
from app.data_access.messaging_schema import initialize_messaging_schema
from app.main import app


class MessagingFlow:
    def prepare(self, url):
        config = replace(settings, env="test", load_demo_seed=False, database_url=url, openai_api_key=None)
        self.enterContext(patch("app.data_access.database.settings", config))
        self.enterContext(patch("app.api.v1.user_plans.settings", replace(config, frontend_url="http://localhost:3000")))
        self.client = self.enterContext(TestClient(app))
        self.farmer, self.farmer_id = self.account("Farmer", "farmer@example.invalid")
        self.expert, self.expert_id = self.account("Review expert", "expert@example.invalid", True)
        self.stranger, self.stranger_id = self.account("Other farmer", "other@example.invalid")
        self.other_expert, self.other_expert_id = self.account("Other expert", "expert2@example.invalid", True)

    def account(self, name, email, admin=False):
        client = TestClient(app)
        self.addCleanup(client.close)
        response = client.post("/api/v1/auth/register", json={"name": name, "email": email,
            "password": "test-messaging-123", "password_confirmation": "test-messaging-123"})
        self.assertEqual(response.status_code, 201, response.text)
        user_id = response.json()["id"]
        if admin:
            with database() as connection:
                connection.execute("UPDATE users SET role='admin' WHERE id=?", (user_id,))
        return client, user_id

    def start(self, expert_id=None):
        response = self.farmer.post("/api/v1/messaging/conversations", json={"expert_id": expert_id or self.expert_id})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.headers["cache-control"], "no-store")
        return response.json()["id"]

    def send(self, client, room, text="Observation", key=None):
        response = client.post(f"/api/v1/messaging/conversations/{room}/messages", json={
            "body": text, "client_message_id": key or str(uuid4()), "sender_id": self.stranger_id})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def unread(self, client):
        return client.get("/api/v1/messaging/unread").json()["unread_count"]

    def test_auth_directory_and_only_real_expert_accounts(self):
        for path in ("experts", "unread", "conversations", "conversations/1/messages"):
            self.assertEqual(self.client.get(f"/api/v1/messaging/{path}").status_code, 401)
        listing = self.farmer.get("/api/v1/messaging/experts").json()
        self.assertEqual({row["id"] for row in listing}, {self.expert_id, self.other_expert_id})
        self.assertNotIn("email", listing[0])
        self.assertNotIn(self.expert_id, {row["id"] for row in self.expert.get("/api/v1/messaging/experts").json()})
        self.assertEqual(self.farmer.post("/api/v1/messaging/conversations", json={"expert_id": self.stranger_id}).status_code, 404)
        self.assertEqual(self.expert.post("/api/v1/messaging/conversations", json={"expert_id": self.expert_id}).status_code, 422)
        self.assertEqual(self.start(), self.start())
        self.assertEqual(self.farmer.get("/api/v1/messaging/conversations").json()["total"], 1)

    def test_only_participants_can_view_send_or_mark_read(self):
        room = self.start()
        message = self.send(self.farmer, room, "<img src=x onerror=alert(1)> Observation")
        self.assertEqual(message["sender_id"], self.farmer_id)
        for outsider in (self.stranger, self.other_expert):
            self.assertEqual(outsider.get(f"/api/v1/messaging/conversations/{room}/messages").status_code, 404)
            self.assertEqual(outsider.post(f"/api/v1/messaging/conversations/{room}/messages", json={"body": "forged", "client_message_id": str(uuid4())}).status_code, 404)
            self.assertEqual(outsider.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": message["id"]}).status_code, 404)
            self.assertEqual(outsider.get("/api/v1/messaging/conversations").json()["total"], 0)
        detail = self.expert.get(f"/api/v1/messaging/conversations/{room}/messages").json()
        self.assertEqual(detail["conversation"]["participant"]["id"], self.farmer_id)
        self.assertEqual(detail["messages"][0]["body"], message["body"])
        self.assertEqual(self.unread(self.expert), 1)
        self.assertEqual(self.unread(self.farmer), 0)

    def test_read_progress_does_not_clear_newer_or_other_messages(self):
        room = self.start()
        first = self.send(self.expert, room, "First reply")
        self.farmer.get(f"/api/v1/messaging/conversations/{room}/messages")
        self.assertEqual(self.unread(self.farmer), 1)
        later = self.send(self.expert, room, "Arrived after the fetch")
        other_room = self.start(self.other_expert_id)
        other = self.send(self.other_expert, other_room, "Another conversation")
        response = self.farmer.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": first["id"]})
        self.assertEqual(response.json()["unread_count"], 2)
        self.assertEqual(self.farmer.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": other["id"]}).status_code, 422)
        self.farmer.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": later["id"]})
        self.farmer.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": first["id"]})
        self.assertEqual(self.unread(self.farmer), 1)
        reply = self.send(self.farmer, room, "Farmer response")
        self.assertEqual(self.unread(self.expert), 1)
        self.expert.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": reply["id"]})
        self.assertEqual(self.unread(self.expert), 0)

    def test_send_retries_are_idempotent_validated_and_origin_checked(self):
        room = self.start()
        key = str(uuid4())
        first = self.send(self.farmer, room, "Observe lower leaves", key)
        duplicate = self.send(self.farmer, room, "Observe lower leaves", key)
        self.assertEqual(first["id"], duplicate["id"])
        self.assertEqual(self.unread(self.expert), 1)
        path = f"/api/v1/messaging/conversations/{room}/messages"
        self.assertEqual(self.farmer.post(path, json={"body": "changed", "client_message_id": key}).status_code, 409)
        for body in (" ", "x" * 4001):
            self.assertEqual(self.farmer.post(path, json={"body": body, "client_message_id": str(uuid4())}).status_code, 422)
        self.assertEqual(self.farmer.post(path, headers={"Origin": "https://bad.invalid"}, json={"body": "blocked", "client_message_id": str(uuid4())}).status_code, 403)

    def test_history_pagination_and_restart_preserve_messages_and_reads(self):
        room = self.start()
        sent = [self.send(self.expert, room, f"Reply {i}") for i in range(7)]
        path = f"/api/v1/messaging/conversations/{room}/messages"
        latest = self.farmer.get(path, params={"limit": 3}).json()
        self.assertEqual([row["id"] for row in latest["messages"]], [row["id"] for row in sent[-3:]])
        self.assertTrue(latest["has_earlier"])
        older = self.farmer.get(path, params={"before_id": sent[-3]["id"], "limit": 3}).json()
        self.assertEqual([row["id"] for row in older["messages"]], [row["id"] for row in sent[1:4]])
        newer = self.farmer.get(path, params={"after_id": sent[0]["id"], "limit": 3}).json()
        self.assertTrue(newer["has_more"])
        self.farmer.post(f"/api/v1/messaging/conversations/{room}/read", json={"through_message_id": sent[-1]["id"]})
        initialize_database()
        self.assertEqual(len(self.farmer.get(path).json()["messages"]), 7)
        self.assertEqual(self.unread(self.farmer), 0)
        self.assertEqual(self.farmer.get("/api/v1/messaging/conversations", params={"limit": 1, "offset": 1}).json()["items"], [])

    def test_profile_location_is_optional_clearable_persistent_and_not_a_role_change(self):
        updated = self.farmer.patch("/api/v1/auth/me", json={"name": "Farmer", "county": " Kiambu ", "area": " Thika   town ", "role": "admin"})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual((updated.json()["county"], updated.json()["area"], updated.json()["role"]), ("Kiambu", "Thika town", "user"))
        self.farmer.patch("/api/v1/auth/me", json={"name": "New name"})
        self.assertEqual(self.farmer.get("/api/v1/auth/me").json()["county"], "Kiambu")
        self.farmer.post("/api/v1/auth/logout")
        logged = self.farmer.post("/api/v1/auth/login", json={"email": "farmer@example.invalid", "password": "test-messaging-123"})
        self.assertEqual(logged.json()["area"], "Thika town")
        cleared = self.farmer.patch("/api/v1/auth/me", json={"name": "New name", "county": "  ", "area": None})
        self.assertIsNone(cleared.json()["county"])
        self.assertIsNone(cleared.json()["area"])
        self.assertEqual(self.farmer.patch("/api/v1/auth/me", json={"name": "Name", "county": "x" * 101}).status_code, 422)

    def test_postgres_identity_sized_references_are_preserved(self):
        large_id = 4_000_000_000
        with database() as connection:
            connection.execute("INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
                               (large_id, "Large-ID test expert", "large@example.invalid", "unused", "admin", "2026-11-22"))
        room = self.start(large_id)
        self.send(self.farmer, room)
        detail = self.farmer.get(f"/api/v1/messaging/conversations/{room}/messages").json()
        self.assertEqual(detail["conversation"]["participant"]["id"], large_id)


class MessagingSqliteTests(MessagingFlow, unittest.TestCase):
    def setUp(self):
        folder = TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.prepare(f"sqlite:///{Path(folder.name) / 'messages.db'}")


@unittest.skipUnless(os.getenv("TEST_POSTGRES_DATABASE_URL") and psycopg, "Set TEST_POSTGRES_DATABASE_URL for PostgreSQL messaging coverage.")
class MessagingPostgresTests(MessagingFlow, unittest.TestCase):
    def setUp(self):
        url = os.environ["TEST_POSTGRES_DATABASE_URL"]
        raw = psycopg.connect(url, autocommit=True)
        self.addCleanup(raw.close)
        schema = "messaging_" + uuid4().hex
        raw.execute(f"CREATE SCHEMA {schema}")
        self.addCleanup(lambda: raw.execute(f"DROP SCHEMA {schema} CASCADE"))
        params = dict(parse_qsl(urlsplit(url).query))
        params["options"] = f"-csearch_path={schema}"
        self.prepare(url.split("?", 1)[0] + "?" + urlencode(params))


class MessagingMigrationTests(unittest.TestCase):
    def test_upgrade_legacy_users_is_additive_and_repeatable(self):
        connection = sqlite3.connect(":memory:")
        self.addCleanup(connection.close)
        with connection:
            connection.execute("CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT)")
            connection.execute("INSERT INTO users(id,name) VALUES (3,'Keep this account')")
            for _ in range(2):
                initialize_messaging_schema(connection, postgres=False)
            self.assertEqual(connection.execute("SELECT name,county,area FROM users WHERE id=3").fetchone(), ("Keep this account", None, None))
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM expert_messages").fetchone()[0], 0)
