"""Schema-only bootstrap for SQLite and PostgreSQL. Contains no sample records."""

SCHEMA_SQL = r"""
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_date TEXT NOT NULL,
    geographic_scope TEXT NOT NULL,
    evidence_status TEXT NOT NULL CHECK (evidence_status IN ('simulated', 'manually_supplied', 'awaiting_validation', 'verified')),
    limitations TEXT NOT NULL,
    UNIQUE(name, source_date, geographic_scope)
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    county TEXT NOT NULL,
    area TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    agro_ecological_context TEXT NOT NULL,
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    UNIQUE(county, area)
);

CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    county TEXT NOT NULL,
    label TEXT NOT NULL,
    period TEXT NOT NULL,
    start_month INTEGER NOT NULL,
    end_month INTEGER NOT NULL,
    basis TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id), name TEXT, description TEXT,
    UNIQUE(county, label)
);

CREATE TABLE IF NOT EXISTS diseases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop TEXT NOT NULL,
    common_name TEXT NOT NULL,
    scientific_name TEXT,
    summary TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    UNIQUE(crop, common_name)
);

CREATE TABLE IF NOT EXISTS disease_symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    plant_part TEXT NOT NULL,
    symptom TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    UNIQUE(disease_id, plant_part, symptom)
);

CREATE TABLE IF NOT EXISTS treatments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    crop TEXT NOT NULL,
    geographic_scope TEXT NOT NULL,
    action TEXT NOT NULL,
    treatment_type TEXT NOT NULL,
    requires_verified_diagnosis INTEGER NOT NULL DEFAULT 0,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated'
);

CREATE TABLE IF NOT EXISTS agrovets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    county TEXT NOT NULL,
    area TEXT NOT NULL,
    address TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    treatment_name TEXT NOT NULL,
    indicative_cost_kes TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    UNIQUE(disease_id, name, county, area, treatment_name)
);

CREATE TABLE IF NOT EXISTS outbreaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    county TEXT NOT NULL,
    area TEXT NOT NULL,
    observed_period TEXT NOT NULL,
    report_summary TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    coordinate_status TEXT NOT NULL DEFAULT 'manually_supplied',
    latitude REAL,
    longitude REAL,
    image_path TEXT,
    image_description TEXT,
    user_symptoms TEXT,
    expert_approval TEXT NOT NULL DEFAULT 'not_required' CHECK (expert_approval IN ('not_required', 'pending', 'approved', 'rejected')),
    expert_review_note TEXT,
    llm_identified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    water_requirement TEXT NOT NULL,
    typical_maturity_days TEXT NOT NULL,
    risk_notes TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated'
, category TEXT, description TEXT, rain_needed_months INTEGER CHECK(rain_needed_months BETWEEN 1 AND 12), rain_needs_notes TEXT, rain_needs_source_id INTEGER REFERENCES sources(id));

CREATE TABLE IF NOT EXISTS planting_calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    county TEXT NOT NULL,
    season_label TEXT NOT NULL,
    planting_window TEXT NOT NULL,
    suitability TEXT NOT NULL CHECK (suitability IN ('strong', 'conditional', 'limited')),
    rationale TEXT NOT NULL,
    practical_steps TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    UNIQUE(crop_id, county, season_label)
);

CREATE TABLE IF NOT EXISTS weather_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    county TEXT NOT NULL,
    season_label TEXT NOT NULL,
    period TEXT NOT NULL,
    rainfall_context TEXT NOT NULL,
    planning_implication TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated', area TEXT, rainy_months INTEGER CHECK(rainy_months BETWEEN 0 AND 12),
    UNIQUE(county, season_label, period)
);

CREATE TABLE IF NOT EXISTS extension_advice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    county TEXT NOT NULL,
    season_label TEXT NOT NULL,
    advice TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    UNIQUE(crop_id, county, season_label, advice)
);

CREATE TABLE IF NOT EXISTS indigenous_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    county TEXT NOT NULL,
    guidance TEXT NOT NULL,
    community_attribution TEXT NOT NULL,
    permission_status TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'awaiting_validation',
    UNIQUE(crop_id, county, guidance)
);

CREATE TABLE IF NOT EXISTS input_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL,
    name TEXT NOT NULL,
    geographic_scope TEXT NOT NULL,
    certification_status TEXT NOT NULL,
    availability_status TEXT NOT NULL,
    guidance TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    UNIQUE(crop_id, input_type, name, geographic_scope)
);

CREATE TABLE IF NOT EXISTS disease_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    workflow_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    crop TEXT,
    county TEXT,
    area TEXT,
    season TEXT NOT NULL,
    status TEXT NOT NULL,
    engine TEXT NOT NULL,
    agent_runs_json TEXT NOT NULL,
    officer_report_json TEXT,
    observation_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    image_path TEXT,
    outbreak_id INTEGER REFERENCES outbreaks(id) ON DELETE SET NULL,
    expert_approval TEXT NOT NULL DEFAULT 'pending'
        CHECK (expert_approval IN ('pending', 'approved', 'rejected')),
    expert_review_note TEXT
);

CREATE TABLE IF NOT EXISTS counties (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS areas (
 id INTEGER PRIMARY KEY, county_id INTEGER NOT NULL REFERENCES counties(id), name TEXT NOT NULL,
 latitude NUMERIC CHECK(latitude BETWEEN -90 AND 90), longitude NUMERIC CHECK(longitude BETWEEN -180 AND 180),
 UNIQUE(county_id, name)
);

CREATE TABLE IF NOT EXISTS varieties (
 id INTEGER PRIMARY KEY, crop_id INTEGER NOT NULL REFERENCES crops(id), name TEXT NOT NULL,
 maturity_days INTEGER CHECK(maturity_days > 0), yield_potential TEXT, description TEXT,
 UNIQUE(crop_id, name)
);

CREATE TABLE IF NOT EXISTS area_season_varieties (
 id INTEGER PRIMARY KEY, area_id INTEGER NOT NULL REFERENCES areas(id), season_id INTEGER NOT NULL REFERENCES seasons(id),
 variety_id INTEGER NOT NULL REFERENCES varieties(id), is_recommended INTEGER NOT NULL DEFAULT 1 CHECK(is_recommended IN (0,1)),
 notes TEXT, source_id INTEGER NOT NULL REFERENCES sources(id), UNIQUE(area_id, season_id, variety_id)
);

CREATE TABLE IF NOT EXISTS management_plans (
 id INTEGER PRIMARY KEY, area_season_variety_id INTEGER NOT NULL UNIQUE REFERENCES area_season_varieties(id),
 title TEXT NOT NULL, overall_notes TEXT
, source_id INTEGER REFERENCES sources(id), rain_needed_months INTEGER CHECK(rain_needed_months BETWEEN 1 AND 12), rain_requirement_notes TEXT, weeding_count INTEGER CHECK(weeding_count >= 0), fertility_notes TEXT);

CREATE TABLE IF NOT EXISTS management_stages (
 id INTEGER PRIMARY KEY, management_plan_id INTEGER NOT NULL REFERENCES management_plans(id),
 stage_order INTEGER NOT NULL CHECK(stage_order > 0), stage_name TEXT NOT NULL,
 duration_days INTEGER CHECK(duration_days > 0), description TEXT, weather_rain_needs TEXT,
 activities TEXT, start_day_after_planting INTEGER, end_day_after_planting INTEGER, timing_notes TEXT, activity_type TEXT, weeding_round INTEGER CHECK(weeding_round > 0), UNIQUE(management_plan_id, stage_order)
);

CREATE TABLE IF NOT EXISTS inputs (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, unit TEXT NOT NULL, category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_inputs (
 id INTEGER PRIMARY KEY, management_stage_id INTEGER NOT NULL REFERENCES management_stages(id),
 input_id INTEGER NOT NULL REFERENCES inputs(id), quantity_per_acre NUMERIC CHECK(quantity_per_acre >= 0),
 notes TEXT, UNIQUE(management_stage_id, input_id)
);

CREATE TABLE IF NOT EXISTS suppliers (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, contact_phone TEXT, contact_email TEXT,
 area_id INTEGER NOT NULL REFERENCES areas(id), latitude NUMERIC CHECK(latitude BETWEEN -90 AND 90),
 longitude NUMERIC CHECK(longitude BETWEEN -180 AND 180), description TEXT,
 is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0,1))
);

CREATE TABLE IF NOT EXISTS supplier_varieties (
 id INTEGER PRIMARY KEY, supplier_id INTEGER NOT NULL REFERENCES suppliers(id), variety_id INTEGER NOT NULL REFERENCES varieties(id),
 season_id INTEGER REFERENCES seasons(id), price NUMERIC CHECK(price >= 0), unit TEXT,
 min_order_qty NUMERIC CHECK(min_order_qty >= 0), notes TEXT,
 UNIQUE(supplier_id, variety_id, season_id)
);

CREATE TABLE IF NOT EXISTS area_season_climate (
 id INTEGER PRIMARY KEY, area_id INTEGER NOT NULL REFERENCES areas(id), season_id INTEGER NOT NULL REFERENCES seasons(id),
 avg_rainfall_mm NUMERIC CHECK(avg_rainfall_mm >= 0), avg_temp_min NUMERIC, avg_temp_max NUMERIC,
 humidity_pct NUMERIC CHECK(humidity_pct BETWEEN 0 AND 100), notes TEXT, data_source TEXT NOT NULL,
 source_id INTEGER NOT NULL REFERENCES sources(id), UNIQUE(area_id, season_id),
 CHECK(avg_temp_min IS NULL OR avg_temp_max IS NULL OR avg_temp_min <= avg_temp_max)
);

CREATE TABLE IF NOT EXISTS crop_climate_requirements (
 crop_id INTEGER PRIMARY KEY REFERENCES crops(id), min_rainfall_mm NUMERIC NOT NULL,
 max_rainfall_mm NUMERIC NOT NULL, min_temp_c NUMERIC NOT NULL, max_temp_c NUMERIC NOT NULL,
 notes TEXT NOT NULL, source_id INTEGER NOT NULL REFERENCES sources(id),
 CHECK(min_rainfall_mm <= max_rainfall_mm AND min_temp_c <= max_temp_c)
);

CREATE TABLE IF NOT EXISTS stage_treatments (
            id INTEGER PRIMARY KEY, management_stage_id INTEGER NOT NULL REFERENCES management_stages(id),
            treatment_type TEXT NOT NULL CHECK(treatment_type IN ('non_chemical','pesticide')),
            name TEXT NOT NULL, timing_notes TEXT, guidance TEXT, source_id INTEGER REFERENCES sources(id),
            UNIQUE(management_stage_id, treatment_type, name));

CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')), created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_plans (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL, snapshot_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_notes (
 id INTEGER PRIMARY KEY, saved_plan_id INTEGER NOT NULL REFERENCES saved_plans(id) ON DELETE CASCADE,
 category TEXT NOT NULL CHECK(category IN ('land_preparation','planting','crop_management','disease','weather','harvest','other')),
 body TEXT NOT NULL, observed_on TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disease_case_comments (
 id INTEGER PRIMARY KEY, disease_case_id INTEGER NOT NULL REFERENCES disease_cases(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 body TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS animal_cases (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL, observation_json TEXT NOT NULL, result_json TEXT NOT NULL
);

"""

SCHEMA_INDEX_SQL = r"""
CREATE UNIQUE INDEX IF NOT EXISTS treatments_seed_identity
ON treatments(disease_id, crop, geographic_scope, action, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS outbreaks_seed_identity
ON outbreaks(disease_id, county, area, observed_period, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_varieties_no_season ON supplier_varieties(supplier_id, variety_id) WHERE season_id IS NULL;

CREATE INDEX IF NOT EXISTS saved_plans_user_id ON saved_plans(user_id, created_at);

CREATE INDEX IF NOT EXISTS plan_notes_plan_id ON plan_notes(saved_plan_id, created_at);

CREATE INDEX IF NOT EXISTS disease_cases_user_id ON disease_cases(user_id, created_at);

CREATE INDEX IF NOT EXISTS disease_case_comments_case_id ON disease_case_comments(disease_case_id, created_at);
"""

# Additive upgrades for databases created before the current schema. No data
# values or fixture provenance are invented while extending existing tables.
SCHEMA_UPGRADES = {
    "outbreaks": {"latitude": "REAL", "longitude": "REAL", "image_path": "TEXT",
        "expert_approval": "TEXT NOT NULL DEFAULT 'not_required'", "expert_review_note": "TEXT",
        "llm_identified": "INTEGER NOT NULL DEFAULT 0", "created_at": "TEXT",
        "image_description": "TEXT", "user_symptoms": "TEXT"},
    "seasons": {"name": "TEXT", "description": "TEXT"},
    "crops": {"category": "TEXT", "description": "TEXT",
        "rain_needed_months": "INTEGER CHECK(rain_needed_months BETWEEN 1 AND 12)",
        "rain_needs_notes": "TEXT", "rain_needs_source_id": "INTEGER REFERENCES sources(id)"},
    "weather_forecasts": {"area": "TEXT", "rainy_months": "INTEGER CHECK(rainy_months BETWEEN 0 AND 12)"},
    "management_plans": {"source_id": "INTEGER REFERENCES sources(id)",
        "rain_needed_months": "INTEGER CHECK(rain_needed_months BETWEEN 1 AND 12)",
        "rain_requirement_notes": "TEXT", "weeding_count": "INTEGER CHECK(weeding_count >= 0)", "fertility_notes": "TEXT"},
    "management_stages": {"start_day_after_planting": "INTEGER", "end_day_after_planting": "INTEGER",
        "timing_notes": "TEXT", "activity_type": "TEXT", "weeding_round": "INTEGER CHECK(weeding_round > 0)"},
    "disease_cases": {"user_id": "INTEGER"},
    "users": {"name": "TEXT NOT NULL DEFAULT ''", "role": "TEXT NOT NULL DEFAULT 'user'"},
}
