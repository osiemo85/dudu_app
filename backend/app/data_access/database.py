import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from app.core.config import settings


def initialize_database() -> None:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.database_path)
    try:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "weather_samples" in tables and "weather_forecasts" not in tables:
            connection.execute("ALTER TABLE weather_samples RENAME TO weather_forecasts")
        connection.executescript(settings.seed_path.read_text(encoding="utf-8"))
        existing_columns = {row[1] for row in connection.execute("PRAGMA table_info(outbreaks)")}
        migrations = {
            "latitude": "REAL",
            "longitude": "REAL",
            "image_path": "TEXT",
            "expert_approval": "TEXT NOT NULL DEFAULT 'not_required'",
            "expert_review_note": "TEXT",
            "llm_identified": "INTEGER NOT NULL DEFAULT 0",
            "created_at": "TEXT",
            "image_description": "TEXT",
            "user_symptoms": "TEXT",
        }
        for column, definition in migrations.items():
            if column not in existing_columns:
                connection.execute(f"ALTER TABLE outbreaks ADD COLUMN {column} {definition}")
        # Extend existing records without replacing the tables used by the app.
        crop_columns = {row[1] for row in connection.execute("PRAGMA table_info(crops)")}
        new_crop_rain_column = "rain_needed_months" not in crop_columns
        for table, columns in {
            "seasons": {"name": "TEXT", "description": "TEXT"},
            "crops": {"category": "TEXT", "description": "TEXT", "rain_needed_months": "INTEGER CHECK(rain_needed_months BETWEEN 1 AND 12)", "rain_needs_notes": "TEXT", "rain_needs_source_id": "INTEGER REFERENCES sources(id)"},
            "weather_forecasts": {"area": "TEXT", "rainy_months": "INTEGER CHECK(rainy_months BETWEEN 0 AND 12)"},
        }.items():
            existing = {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
            for column, definition in columns.items():
                if column not in existing:
                    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        connection.execute("UPDATE seasons SET name = label WHERE name IS NULL")
        connection.execute("UPDATE seasons SET description = basis WHERE description IS NULL")
        connection.execute("UPDATE crops SET description = summary WHERE description IS NULL")
        connection.execute("UPDATE crops SET category = CASE name WHEN 'Maize' THEN 'Cereal' WHEN 'Sorghum' THEN 'Cereal' WHEN 'Bean' THEN 'Legume' WHEN 'Potato' THEN 'Root' END WHERE category IS NULL")
        # Fill only missing fields on the known demo crops; preserve contributor edits.
        if new_crop_rain_column:
            connection.execute("UPDATE crops SET rain_needed_months = CASE name WHEN 'Maize' THEN 4 WHEN 'Bean' THEN 3 WHEN 'Potato' THEN 3 WHEN 'Sorghum' THEN 2 END, rain_needs_notes = 'Fictional duration for testing; not locally validated.' WHERE name IN ('Maize', 'Bean', 'Potato', 'Sorghum')")
        # Rename only the original untouched sample suppliers; retain their IDs and links.
        if connection.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='suppliers'").fetchone():
            connection.execute("""
                UPDATE suppliers SET name = (SELECT name || ' Agrovet' FROM areas WHERE id=suppliers.area_id)
                WHERE description='Simulated supplier; no verified stock or contact.'
                  AND name = 'Fictional ' || (SELECT name FROM areas WHERE id=suppliers.area_id) || ' Supplier'
                  AND NOT EXISTS (SELECT 1 FROM suppliers other WHERE other.name =
                    (SELECT name || ' Agrovet' FROM areas WHERE id=suppliers.area_id))
            """)
        connection.executescript((settings.seed_path.parent / "planting_tables.sql").read_text(encoding="utf-8"))
        # Repair the known fixtures from databases initialized before the source
        # link migration was added. Run once and never overwrite edited records.
        connection.execute("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)")
        migration = "planting_rain_fixture_sources_v1"
        if not connection.execute("SELECT 1 FROM schema_migrations WHERE name = ?", (migration,)).fetchone():
            connection.execute("""
                UPDATE crops SET rain_needs_source_id = (
                    SELECT id FROM sources WHERE name = 'Planting crop rain test fixtures'
                    AND source_date = '2025-01-15' AND geographic_scope = 'Selected demonstration areas'
                )
                WHERE rain_needs_source_id IS NULL
                  AND rain_needs_notes = 'Fictional duration for testing; not locally validated.'
                  AND ((name = 'Maize' AND rain_needed_months = 4)
                    OR (name = 'Bean' AND rain_needed_months = 3)
                    OR (name = 'Potato' AND rain_needed_months = 3)
                    OR (name = 'Sorghum' AND rain_needed_months = 2))
            """)
            connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", (migration,))
        # Backfill only untouched original fixture suppliers once. Existing
        # contributor-provided contact details are never overwritten.
        migration = "demo_supplier_contacts_v1"
        if not connection.execute("SELECT 1 FROM schema_migrations WHERE name = ?", (migration,)).fetchone():
            connection.execute("""
                UPDATE suppliers SET
                  contact_phone = COALESCE(contact_phone, CASE name
                    WHEN 'Thika Agrovet' THEN '+254 000 000 001'
                    WHEN 'Njoro Agrovet' THEN '+254 000 000 002'
                    WHEN 'Kerugoya Agrovet' THEN '+254 000 000 003'
                    WHEN 'Kangundo Agrovet' THEN '+254 000 000 004' END),
                  contact_email = COALESCE(contact_email, CASE name
                    WHEN 'Thika Agrovet' THEN 'thika@example.invalid'
                    WHEN 'Njoro Agrovet' THEN 'njoro@example.invalid'
                    WHEN 'Kerugoya Agrovet' THEN 'kerugoya@example.invalid'
                    WHEN 'Kangundo Agrovet' THEN 'kangundo@example.invalid' END)
                WHERE name IN ('Thika Agrovet','Njoro Agrovet','Kerugoya Agrovet','Kangundo Agrovet')
                  AND description='Simulated supplier; no verified stock or contact.' AND is_verified=0
            """)
            connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", (migration,))
        # Plans predate source attribution; add it without changing contributor records.
        plan_columns = {row[1] for row in connection.execute("PRAGMA table_info(management_plans)")}
        if "source_id" not in plan_columns:
            connection.execute("ALTER TABLE management_plans ADD COLUMN source_id INTEGER REFERENCES sources(id)")
        connection.execute("INSERT OR IGNORE INTO sources(name,source_date,geographic_scope,evidence_status,limitations) VALUES ('Planting management test fixtures','2025-01-15','Selected demonstration areas','simulated','Fictional management stages for testing, not locally validated agronomic advice.')")
        connection.execute("UPDATE management_plans SET source_id=(SELECT id FROM sources WHERE name='Planting management test fixtures' AND source_date='2025-01-15' AND geographic_scope='Selected demonstration areas') WHERE source_id IS NULL AND (title LIKE 'Demo plan: %' AND overall_notes='Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.' OR title='Demo management plan' AND overall_notes='Fictional steps for testing; consult local extension advice.')")
        for table, columns in {
            "management_plans": {"rain_needed_months": "INTEGER CHECK(rain_needed_months BETWEEN 1 AND 12)", "rain_requirement_notes": "TEXT", "weeding_count": "INTEGER CHECK(weeding_count >= 0)", "fertility_notes": "TEXT"},
            "management_stages": {"start_day_after_planting": "INTEGER", "end_day_after_planting": "INTEGER", "timing_notes": "TEXT", "activity_type": "TEXT", "weeding_round": "INTEGER CHECK(weeding_round > 0)"},
        }.items():
            existing = {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
            for column, definition in columns.items():
                if column not in existing:
                    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        connection.execute("""CREATE TABLE IF NOT EXISTS stage_treatments (
            id INTEGER PRIMARY KEY, management_stage_id INTEGER NOT NULL REFERENCES management_stages(id),
            treatment_type TEXT NOT NULL CHECK(treatment_type IN ('non_chemical','pesticide')),
            name TEXT NOT NULL, timing_notes TEXT, guidance TEXT, source_id INTEGER REFERENCES sources(id),
            UNIQUE(management_stage_id, treatment_type, name))""")
        migration = "management_test_details_v1"
        if not connection.execute("SELECT 1 FROM schema_migrations WHERE name=?", (migration,)).fetchone():
            connection.executescript((settings.seed_path.parent / "management_enrichment.sql").read_text(encoding="utf-8"))
            connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", (migration,))
        migration = "management_demo_harvest_timing_v2"
        if not connection.execute("SELECT 1 FROM schema_migrations WHERE name=?", (migration,)).fetchone():
            connection.execute("""UPDATE management_stages SET
                start_day_after_planting=(SELECT CASE WHEN v.maturity_days IS NOT NULL THEN max(0,v.maturity_days-10) END FROM management_plans p JOIN area_season_varieties av ON av.id=p.area_season_variety_id JOIN varieties v ON v.id=av.variety_id WHERE p.id=management_stages.management_plan_id),
                end_day_after_planting=(SELECT v.maturity_days FROM management_plans p JOIN area_season_varieties av ON av.id=p.area_season_variety_id JOIN varieties v ON v.id=av.variety_id WHERE p.id=management_stages.management_plan_id)
                WHERE stage_name='Harvest' AND start_day_after_planting=90 AND end_day_after_planting=110
                  AND timing_notes='Fictional test timing relative to planting; not field guidance.'
                  AND management_plan_id IN (SELECT id FROM management_plans WHERE rain_requirement_notes='Fictional test duration only; rain distribution and intensity are unknown.')""")
            connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", (migration,))
        migration = "management_input_examples_v1"
        if not connection.execute("SELECT 1 FROM schema_migrations WHERE name=?", (migration,)).fetchone():
            connection.executescript((settings.seed_path.parent / "management_input_examples.sql").read_text(encoding="utf-8"))
            connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", (migration,))
        connection.executescript((settings.seed_path.parent / "user_plans.sql").read_text(encoding="utf-8"))
        connection.commit()
    finally:
        connection.close()


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()

