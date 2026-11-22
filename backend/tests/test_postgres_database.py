import os
import unittest
from dataclasses import replace
from urllib.parse import parse_qsl, urlencode, urlsplit
from uuid import uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.data_access.database import _PostgresConnection, _postgres_script, psycopg
from app.data_access.messaging_schema import initialize_messaging_schema
from app.main import app


@unittest.skipUnless(os.getenv("TEST_POSTGRES_DATABASE_URL") and psycopg,
                     "Set TEST_POSTGRES_DATABASE_URL for PostgreSQL connection tests.")
class PostgresConnectionTests(unittest.TestCase):
    def setUp(self):
        url = os.environ["TEST_POSTGRES_DATABASE_URL"]
        self.raw = psycopg.connect(url, autocommit=True)
        self.addCleanup(self.raw.close)
        schema = "connection_test_" + uuid4().hex
        self.raw.execute(f"CREATE SCHEMA {schema}")
        self.addCleanup(lambda: self.raw.execute(f"DROP SCHEMA {schema} CASCADE"))
        self.raw.execute(f"SET search_path TO {schema}")
        self.raw.execute("CREATE TABLE disease_cases (id BIGINT PRIMARY KEY, user_id BIGINT, created_at TEXT)")
        for statement in _postgres_script((settings.seed_path.parent / "user_plans.sql").read_text()):
            self.raw.execute(statement)
        initialize_messaging_schema(self.raw, postgres=True)
        self.connection = _PostgresConnection(self.raw)
        parts = urlsplit(url)
        params = dict(parse_qsl(parts.query))
        params["options"] = f"-csearch_path={schema}"
        scoped_url = url.split("?", 1)[0] + "?" + urlencode(params)
        self.enterContext(patch("app.data_access.database.settings",
                                replace(settings, env="test", database_url=scoped_url)))

    def insert_user(self, email="farmer@example.invalid"):
        return self.connection.execute(
            "INSERT INTO users(email,password_hash,created_at) VALUES (?,?,?)",
            (email, "test hash", "2026-11-22"),
        )

    def test_session_insert_without_prior_sequence_use(self):
        # Explicit IDs leave LASTVAL undefined on this connection.
        self.raw.execute("INSERT INTO users(id,email,password_hash,created_at) VALUES (100,'test@example.invalid','hash','2026-11-22')")
        cursor = self.connection.execute(
            "INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES (?,?,?);",
            ("test token hash", 100, "2026-11-29"),
        )
        self.assertIsNone(cursor.lastrowid)
        self.assertEqual(cursor.rowcount, 1)
        self.assertEqual(self.connection.execute("SELECT user_id FROM user_sessions").fetchone()["user_id"], 100)

    def test_generated_id_comes_from_insert_even_when_a_trigger_uses_another_sequence(self):
        self.raw.execute("CREATE TABLE audit (id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1000))")
        self.raw.execute("""CREATE FUNCTION audit_user() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN INSERT INTO audit DEFAULT VALUES; RETURN NEW; END $$""")
        self.raw.execute("CREATE TRIGGER audit_user AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION audit_user()")
        self.assertEqual(self.insert_user().lastrowid, 1)
        self.assertEqual(self.raw.execute("SELECT id FROM audit").fetchone()[0], 1000)

    def test_ignored_insert_has_no_stale_id(self):
        self.assertEqual(self.insert_user().lastrowid, 1)
        cursor = self.connection.execute(
            "INSERT INTO users(email,password_hash,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING",
            ("farmer@example.invalid", "test hash", "2026-11-22"),
        )
        self.assertIsNone(cursor.lastrowid)
        self.assertEqual(cursor.rowcount, 0)

    def test_explicit_id_is_returned_without_sequence_use(self):
        cursor = self.connection.execute(
            "INSERT INTO users(id,email,password_hash,created_at) VALUES (?,?,?,?)",
            (200, "test@example.invalid", "hash", "2026-11-22"),
        )
        self.assertEqual(cursor.lastrowid, 200)

    def test_explicit_returning_remains_available_to_caller(self):
        cursor = self.connection.execute(
            "INSERT INTO users(email,password_hash,created_at) VALUES (?,?,?) RETURNING id,email",
            ("test@example.invalid", "hash", "2026-11-22"),
        )
        self.assertEqual(cursor.fetchone(), {"id": 1, "email": "test@example.invalid"})

    def test_registration_login_and_logout_use_persisted_sessions(self):
        # Tables are prepared in the isolated schema, so skip application startup.
        client = TestClient(app)
        self.addCleanup(client.close)
        credentials = {"email": "farmer@example.com", "password": "test-password-123"}
        response = client.post("/api/v1/auth/register", json={
            **credentials, "name": "Farmer", "password_confirmation": credentials["password"],
        })
        self.assertEqual(response.status_code, 201, response.text)
        account = response.json()
        self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertEqual(client.get("/api/v1/auth/me").json(), account)
        self.assertEqual(client.post("/api/v1/auth/logout").status_code, 204)
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(self.raw.execute("SELECT count(*) FROM user_sessions").fetchone()[0], 0)
        response = client.post("/api/v1/auth/login", json=credentials)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), account)
        self.assertEqual(client.get("/api/v1/auth/me").json(), account)
        self.assertEqual(self.raw.execute("SELECT count(*) FROM user_sessions").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
