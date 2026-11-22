import os
import sqlite3
import unittest
from uuid import uuid4

from app.core.config import settings
from app.data_access.database import _postgres_script, _split_sql, psycopg


class PostgresTranslationTests(unittest.TestCase):
    def test_comment_semicolons_and_quotes_do_not_split_fixture_statements(self):
        statements = _split_sql("""-- Farmer's test fixtures; not field advice.
            SELECT 'semi;colon'; /* Contributor's notes; still a comment. */
            SELECT 'farmer''s observation'; -- Trailing note; harmless.
        """)
        self.assertEqual(len(statements), 3)
        self.assertIn("SELECT 'semi;colon'", statements[0])
        self.assertIn("SELECT 'farmer''s observation'", statements[1])
        self.assertNotIn("SELECT", statements[2])

    def test_explicit_ids_advance_sequence_before_generated_ids(self):
        statements = _postgres_script("""
            INSERT OR IGNORE INTO sources (id, name) VALUES (5, 'explicit');
            INSERT OR IGNORE INTO sources (name) VALUES ('generated');
        """)
        self.assertEqual(len(statements), 3)
        self.assertIn("VALUES (5, 'explicit') ON CONFLICT DO NOTHING", statements[0])
        self.assertIn("pg_get_serial_sequence('sources', 'id')", statements[1])
        self.assertIn("SELECT MAX(id) FROM sources", statements[1])
        self.assertIn("VALUES ('generated') ON CONFLICT DO NOTHING", statements[2])


@unittest.skipUnless(os.getenv("TEST_POSTGRES_DATABASE_URL") and psycopg,
                     "Set TEST_POSTGRES_DATABASE_URL for PostgreSQL fixture regression tests.")
class PostgresSeedTests(unittest.TestCase):
    def setUp(self):
        # Isolate fixtures from the configured database and its existing tables.
        self.connection = psycopg.connect(os.environ["TEST_POSTGRES_DATABASE_URL"], autocommit=True)
        self.addCleanup(self.connection.close)
        self.schema = "seed_test_" + uuid4().hex
        self.connection.execute(f"CREATE SCHEMA {self.schema}")
        self.addCleanup(lambda: self.connection.execute(f"DROP SCHEMA {self.schema} CASCADE"))
        self.connection.execute(f"SET search_path TO {self.schema}")

    def assert_seed_matches_sqlite(self):
        script = settings.seed_path.read_text(encoding="utf-8")
        expected = sqlite3.connect(":memory:")
        self.addCleanup(expected.close)
        expected.executescript(script)
        # Check every dependent module's records and their source attribution,
        # rather than accepting a startup that silently omits fixture rows.
        for table in ("seasons", "diseases", "treatments", "agrovets", "outbreaks", "crops",
                      "planting_calendars", "weather_forecasts", "extension_advice",
                      "indigenous_knowledge", "input_records"):
            query = f"SELECT s.name FROM {table} r JOIN sources s ON s.id=r.source_id ORDER BY s.name"
            with self.subTest(table=table):
                self.assertEqual(self.connection.execute(query).fetchall(), expected.execute(query).fetchall())

    def test_fresh_seed_and_repeated_seed_preserve_all_source_links(self):
        statements = _postgres_script(settings.seed_path.read_text(encoding="utf-8"))
        for _ in range(2):
            for statement in statements:
                self.connection.execute(statement)
            self.assert_seed_matches_sqlite()

    def test_sequence_accounts_for_existing_higher_ids_and_preserves_edits(self):
        statements = _postgres_script(settings.seed_path.read_text(encoding="utf-8"))
        self.connection.execute(statements[0])  # Create the sources table.
        self.connection.execute("""INSERT INTO sources
            (id, name, source_date, geographic_scope, evidence_status, limitations)
            VALUES (200, 'Contributor source', '2026-11-22', 'Test area', 'manually_supplied', 'Keep this record.')""")
        for statement in statements:
            self.connection.execute(statement)
        self.assert_seed_matches_sqlite()
        self.assertEqual(self.connection.execute("SELECT limitations FROM sources WHERE id=200").fetchone(),
                         ("Keep this record.",))
        self.assertGreater(self.connection.execute("SELECT id FROM sources WHERE name='Shamba Guide simulated weather scenarios'").fetchone()[0], 200)


if __name__ == "__main__":
    unittest.main()
