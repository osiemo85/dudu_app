PRAGMA foreign_keys = ON;

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
    source_id INTEGER NOT NULL REFERENCES sources(id),
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
);

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
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
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

CREATE UNIQUE INDEX IF NOT EXISTS treatments_seed_identity
ON treatments(disease_id, crop, geographic_scope, action, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS outbreaks_seed_identity
ON outbreaks(disease_id, county, area, observed_period, source_id);

INSERT OR IGNORE INTO sources (id, name, source_date, geographic_scope, evidence_status, limitations) VALUES
  (1, 'Shamba Guide demo disease reference', '2025-01-15', 'Kenya demonstration counties', 'simulated', 'Illustrative symptom matching only; not expert or laboratory validated.'),
  (2, 'Shamba Guide demo field history', '2024-10-01', 'Selected demonstration areas', 'simulated', 'Historical fictional records for interface testing; not evidence of a current outbreak.'),
  (3, 'Shamba Guide demo crop-care notes', '2025-01-15', 'Kenya demonstration counties', 'simulated', 'General non-chemical actions only; confirm locally with an extension officer.'),
  (4, 'Shamba Guide demo seasonal context', '2025-01-01', 'Selected demonstration counties', 'simulated', 'Simplified sample periods; actual rainfall and seasons vary by local conditions.'),
  (5, 'Farmer-submitted LLM observation', 'ongoing', 'User-supplied location', 'awaiting_validation', 'Unverified observation saved for expert review; it is not an outbreak confirmation.');

INSERT OR IGNORE INTO sources (name, source_date, geographic_scope, evidence_status, limitations) VALUES
  ('Shamba Guide demo planting calendar', '2025-01-15', 'Selected demonstration counties', 'simulated', 'Illustrative planning windows only; verify rainfall onset, soil condition, and current county advice before planting.'),
  ('Shamba Guide simulated weather scenarios', '2025-01-15', 'Selected demonstration counties', 'simulated', 'Scenario data for testing decisions; it is not a forecast or a current weather observation.'),
  ('Shamba Guide demo extension notes', '2025-01-15', 'Selected demonstration counties', 'simulated', 'Fictional extension-style notes for interface testing; not advice from a named extension service.'),
  ('Shamba Guide demo input register', '2025-01-15', 'Kenya demonstration counties', 'simulated', 'Does not confirm regulatory status, supplier stock, price, quality, or current local availability.'),
  ('Shamba Guide local-knowledge research placeholder', '2024-12-01', 'Selected demonstration counties', 'awaiting_validation', 'Illustrative knowledge records awaiting community attribution, permission, and local validation before operational use.'),
  ('Shamba Guide demo agrovet directory', '2025-01-15', 'Selected demonstration areas', 'simulated', 'Illustrative directory and indicative costs only; does not verify a business, product stock, current price, regulatory approval, or product suitability.');

INSERT OR IGNORE INTO locations (id, county, area, latitude, longitude, agro_ecological_context) VALUES
  (1, 'Nakuru', 'Njoro', -0.3300, 35.9500, 'Cool highland demonstration context'),
  (2, 'Kiambu', 'Thika', -1.0333, 37.0693, 'Central highland demonstration context'),
  (3, 'Kirinyaga', 'Kerugoya', -0.4989, 37.2803, 'Humid highland demonstration context'),
  (4, 'Machakos', 'Kangundo', -1.3034, 37.3481, 'Semi-arid eastern demonstration context');

INSERT OR IGNORE INTO seasons (county, label, period, start_month, end_month, basis, source_id) VALUES
  ('Nakuru', 'Long rains', 'March–June', 3, 6, 'User selection matched to a simulated county period', 4),
  ('Nakuru', 'Short rains', 'October–December', 10, 12, 'User selection matched to a simulated county period', 4),
  ('Kiambu', 'Long rains', 'March–June', 3, 6, 'User selection matched to a simulated county period', 4),
  ('Kiambu', 'Short rains', 'October–December', 10, 12, 'User selection matched to a simulated county period', 4),
  ('Kirinyaga', 'Long rains', 'March–June', 3, 6, 'User selection matched to a simulated county period', 4),
  ('Kirinyaga', 'Short rains', 'October–December', 10, 12, 'User selection matched to a simulated county period', 4),
  ('Machakos', 'Long rains', 'March–May', 3, 5, 'User selection matched to a simulated county period', 4),
  ('Machakos', 'Short rains', 'October–December', 10, 12, 'User selection matched to a simulated county period', 4);

INSERT OR IGNORE INTO diseases (id, crop, common_name, scientific_name, summary, source_id) VALUES
  (1, 'Tomato', 'Early blight', 'Alternaria solani', 'A possible fungal leaf and stem disease often associated with expanding brown lesions and concentric rings.', 1),
  (2, 'Tomato', 'Late blight', 'Phytophthora infestans', 'A possible rapidly spreading disease associated with water-soaked lesions in cool, wet conditions.', 1),
  (3, 'Maize', 'Maize lethal necrosis-like symptoms', NULL, 'A symptom pattern that needs expert confirmation because several stresses can look similar.', 1),
  (4, 'Maize', 'Northern corn leaf blight', 'Exserohilum turcicum', 'A possible fungal leaf disease associated with elongated grey-green or tan lesions.', 1),
  (5, 'Bean', 'Angular leaf spot', 'Pseudocercospora griseola', 'A possible fungal disease with angular lesions constrained by leaf veins.', 1),
  (6, 'Potato', 'Late blight', 'Phytophthora infestans', 'A possible rapidly spreading leaf and stem disease favored by cool, wet conditions.', 1);

INSERT OR IGNORE INTO disease_symptoms (disease_id, plant_part, symptom, weight) VALUES
  (1, 'leaf', 'brown spots', 1.0), (1, 'leaf', 'concentric rings', 1.5), (1, 'lower leaves', 'yellowing', 0.7),
  (2, 'leaf', 'water-soaked lesions', 1.4), (2, 'leaf underside', 'white growth', 1.3), (2, 'whole plant', 'rapid spread', 1.0),
  (3, 'leaf', 'mottling', 1.0), (3, 'leaf margin', 'necrosis', 1.0), (3, 'whole plant', 'stunting', 0.8),
  (4, 'leaf', 'long cigar-shaped lesions', 1.6), (4, 'leaf', 'grey-green lesions', 1.0), (4, 'leaf', 'tan lesions', 0.8),
  (5, 'leaf', 'angular brown spots', 1.5), (5, 'leaf', 'yellow halo', 0.8), (5, 'pod', 'dark spots', 0.7),
  (6, 'leaf', 'water-soaked lesions', 1.4), (6, 'leaf underside', 'white growth', 1.3), (6, 'stem', 'brown lesions', 0.8);

INSERT OR IGNORE INTO treatments (disease_id, crop, geographic_scope, action, treatment_type, requires_verified_diagnosis, source_id) VALUES
  (1, 'Tomato', 'Kenya demonstration counties', 'Remove badly affected plant material, avoid moving wet foliage between rows, and ask a local extension officer to confirm the cause before choosing any crop-protection product.', 'general crop hygiene', 0, 3),
  (2, 'Tomato', 'Kenya demonstration counties', 'Separate badly affected plants where practical and seek prompt confirmation from an extension officer. Follow only the locally applicable product label for any crop-protection product.', 'escalation and crop hygiene', 1, 3),
  (3, 'Maize', 'Kenya demonstration counties', 'Do not move symptomatic plant material to other fields. Ask a qualified extension officer to inspect the crop because laboratory or expert confirmation may be needed.', 'escalation', 1, 3),
  (4, 'Maize', 'Kenya demonstration counties', 'Record how quickly lesions are spreading, reduce movement through wet crops, and confirm management choices with a local extension officer.', 'monitoring and crop hygiene', 0, 3),
  (5, 'Bean', 'Kenya demonstration counties', 'Avoid handling plants while wet, remove heavily affected residue where locally appropriate, and confirm seed and crop-management options with an extension officer.', 'general crop hygiene', 0, 3),
  (6, 'Potato', 'Kenya demonstration counties', 'Seek prompt local confirmation, limit movement of affected foliage, and use only locally authorized products exactly as directed on the product label.', 'escalation and crop hygiene', 1, 3);

INSERT OR IGNORE INTO agrovets (disease_id, name, county, area, address, phone_number, treatment_name, indicative_cost_kes, source_id) VALUES
  (1, 'Thika Crop Care Demo', 'Kiambu', 'Thika', 'Kenyatta Avenue, Thika (simulated)', '+254 700 000 101', 'Early-blight assessment and label guidance', 'KES 250–400 consultation range', (SELECT id FROM sources WHERE name = 'Shamba Guide demo agrovet directory')),
  (2, 'Thika Crop Care Demo', 'Kiambu', 'Thika', 'Kenyatta Avenue, Thika (simulated)', '+254 700 000 101', 'Late-blight assessment and label guidance', 'KES 250–400 consultation range', (SELECT id FROM sources WHERE name = 'Shamba Guide demo agrovet directory')),
  (4, 'Njoro Farm Support Demo', 'Nakuru', 'Njoro', 'Main Road, Njoro (simulated)', '+254 700 000 402', 'Leaf-blight assessment and label guidance', 'KES 300–450 consultation range', (SELECT id FROM sources WHERE name = 'Shamba Guide demo agrovet directory')),
  (5, 'Kerugoya Growers Demo', 'Kirinyaga', 'Kerugoya', 'Market Street, Kerugoya (simulated)', '+254 700 000 503', 'Angular-leaf-spot assessment and label guidance', 'KES 200–350 consultation range', (SELECT id FROM sources WHERE name = 'Shamba Guide demo agrovet directory')),
  (3, 'Kangundo Farm Support Demo', 'Machakos', 'Kangundo', 'Market Road, Kangundo (simulated)', '+254 700 000 304', 'Maize symptom assessment and referral', 'KES 250–400 consultation range', (SELECT id FROM sources WHERE name = 'Shamba Guide demo agrovet directory'));

INSERT OR IGNORE INTO outbreaks (disease_id, county, area, observed_period, report_summary, source_id) VALUES
  (2, 'Kiambu', 'Thika', 'April 2024', 'Simulated historical late blight-like observations used to demonstrate area matching.', 2),
  (4, 'Nakuru', 'Njoro', 'May 2024', 'Simulated historical leaf blight observations used to demonstrate area matching.', 2),
  (5, 'Kirinyaga', 'Kerugoya', 'November 2024', 'Simulated historical angular leaf spot-like observations used to demonstrate area matching.', 2);

INSERT OR IGNORE INTO crops (name, summary, water_requirement, typical_maturity_days, risk_notes, source_id) VALUES
  ('Maize', 'A staple cereal represented here by locally adaptable maturity choices.', 'medium', '90–150 days depending on variety', 'Rainfall timing, fall armyworm monitoring, and variety maturity materially affect outcomes.', (SELECT id FROM sources WHERE name = 'Shamba Guide demo planting calendar')),
  ('Bean', 'A food and market legume that can support rotation and household nutrition.', 'low_to_medium', '65–100 days depending on variety', 'Waterlogging, seed-borne disease, and rainfall during flowering can reduce performance.', (SELECT id FROM sources WHERE name = 'Shamba Guide demo planting calendar')),
  ('Potato', 'A highland food and market crop requiring suitable seed, drainage, and disease management.', 'medium', '90–120 days depending on variety', 'Seed health, late blight pressure, and market timing can create substantial risk.', (SELECT id FROM sources WHERE name = 'Shamba Guide demo planting calendar')),
  ('Sorghum', 'A cereal option represented for drier demonstration contexts.', 'low', '95–130 days depending on variety', 'Bird damage, market access, and establishment under erratic rainfall should be planned for.', (SELECT id FROM sources WHERE name = 'Shamba Guide demo planting calendar'));

INSERT OR IGNORE INTO planting_calendars (crop_id, county, season_label, planting_window, suitability, rationale, practical_steps, source_id) VALUES
  ((SELECT id FROM crops WHERE name='Maize'), 'Kiambu', 'Long rains', 'After locally confirmed onset of effective rains, typically within the March–April demo window', 'strong', 'The simulated calendar links maize to the central highland long-rains context.', 'Confirm effective rainfall onset; prepare a well-drained seedbed; choose a locally appropriate maturity class; plant using current locally validated spacing guidance; scout emergence and early pests.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Bean'), 'Kiambu', 'Long rains', 'Near the locally confirmed start of effective rains in the March–April demo window', 'strong', 'The simulated calendar identifies beans as a shorter-duration option for this location and season.', 'Use clean seed from a trustworthy source; avoid waterlogged ground; confirm variety and seed treatment locally; inspect emergence; keep records of rainfall and crop response.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Potato'), 'Kiambu', 'Long rains', 'Early in the locally confirmed long-rains period', 'conditional', 'The highland context can fit potato, but seed health, drainage, and disease pressure must be managed.', 'Confirm field drainage; obtain traceable seed; verify variety suitability; plan earthing-up and disease scouting; confirm market and storage arrangements.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Maize'), 'Nakuru', 'Long rains', 'After effective rains are established, within the March–April demo window', 'strong', 'The cool highland demonstration context and calendar support maize with a suitable maturity choice.', 'Check soil moisture at planting depth; select maturity for the expected season length; use locally validated fertility guidance; monitor establishment and pests; retain field records.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Potato'), 'Nakuru', 'Long rains', 'Early March to April in this simulated calendar, only after adequate soil moisture', 'strong', 'The cool highland demonstration context is represented as suitable where drainage and clean seed are available.', 'Test drainage; source traceable seed; confirm disease-management plans with an extension professional; earth up on time; avoid relying on simulated market information.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Bean'), 'Kirinyaga', 'Short rains', 'After effective short rains begin, within the October–November demo window', 'strong', 'The humid highland demonstration context and shorter crop duration can suit beans.', 'Select a locally adapted variety; use clean seed; ensure drainage; monitor leaf disease; confirm harvest drying arrangements.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Maize'), 'Kirinyaga', 'Long rains', 'After effective rains begin in the March–April demo window', 'strong', 'The simulated local calendar supports maize where season length and field drainage are adequate.', 'Match maturity to the planting date; assess drainage; use a locally reviewed soil-fertility plan; monitor pests; review progress after establishment.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Sorghum'), 'Machakos', 'Short rains', 'At confirmed onset of effective rains, usually October–November in this demo record', 'strong', 'Lower water demand makes sorghum a comparatively resilient option in the semi-arid demonstration context.', 'Conserve soil moisture; choose an adapted maturity class; plant after effective rain rather than a single shower; plan bird management and market use; monitor establishment.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Bean'), 'Machakos', 'Short rains', 'At confirmed onset of effective rains in the October–November demo window', 'conditional', 'Short-duration beans may fit, but erratic rainfall raises establishment and flowering risk.', 'Prefer a locally adapted short-duration variety; avoid poorly drained pockets; retain seed for possible gap filling; monitor soil moisture; discuss rainfall risk with local extension staff.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar')),
  ((SELECT id FROM crops WHERE name='Maize'), 'Machakos', 'Short rains', 'Only after effective rains are established in the October–November demo window', 'limited', 'The semi-arid demonstration context makes maize more exposed to rainfall and maturity risk than lower-water options.', 'Use only a locally appropriate early maturity choice; avoid expanding area without a moisture plan; compare sorghum; confirm seasonal information locally; reassess after emergence.', (SELECT id FROM sources WHERE name='Shamba Guide demo planting calendar'));

INSERT OR IGNORE INTO weather_forecasts (county, season_label, period, rainfall_context, planning_implication, source_id) VALUES
  ('Kiambu', 'Long rains', 'March–June 2025 scenario', 'A normal-onset scenario with intermittent wet spells.', 'Wait for effective rain and preserve drainage; this scenario must not be treated as the current forecast.', (SELECT id FROM sources WHERE name='Shamba Guide simulated weather scenarios')),
  ('Nakuru', 'Long rains', 'March–June 2025 scenario', 'A cool-season scenario with uneven early rainfall.', 'Confirm moisture at planting depth and avoid calendar-only planting.', (SELECT id FROM sources WHERE name='Shamba Guide simulated weather scenarios')),
  ('Kirinyaga', 'Short rains', 'October–December 2025 scenario', 'A wet scenario with possible periods of excess field moisture.', 'Prioritize drainage and disease scouting; verify actual conditions before planting.', (SELECT id FROM sources WHERE name='Shamba Guide simulated weather scenarios')),
  ('Machakos', 'Short rains', 'October–December 2025 scenario', 'A below-normal and erratic rainfall scenario.', 'Favor lower-water and shorter-duration options and avoid planting after an isolated shower.', (SELECT id FROM sources WHERE name='Shamba Guide simulated weather scenarios'));

INSERT OR IGNORE INTO extension_advice (crop_id, county, season_label, advice, source_id) VALUES
  ((SELECT id FROM crops WHERE name='Maize'), 'Kiambu', 'Long rains', 'Match maturity class to the actual planting date and seek a current soil-based fertility recommendation.', (SELECT id FROM sources WHERE name='Shamba Guide demo extension notes')),
  ((SELECT id FROM crops WHERE name='Potato'), 'Nakuru', 'Long rains', 'Verify seed traceability and have a locally reviewed late-blight monitoring plan before planting.', (SELECT id FROM sources WHERE name='Shamba Guide demo extension notes')),
  ((SELECT id FROM crops WHERE name='Bean'), 'Kirinyaga', 'Short rains', 'Prioritize drainage and clean seed, then monitor foliage closely during wet periods.', (SELECT id FROM sources WHERE name='Shamba Guide demo extension notes')),
  ((SELECT id FROM crops WHERE name='Sorghum'), 'Machakos', 'Short rains', 'Choose a locally adapted maturity class and decide how grain will be used or marketed before expanding the planted area.', (SELECT id FROM sources WHERE name='Shamba Guide demo extension notes'));

INSERT OR IGNORE INTO indigenous_knowledge (crop_id, county, guidance, community_attribution, permission_status, source_id) VALUES
  ((SELECT id FROM crops WHERE name='Sorghum'), 'Machakos', 'Use several locally observed rain-onset signs together and confirm soil moisture rather than planting after one isolated shower.', 'Generic demonstration placeholder; no community endorsement claimed', 'awaiting community review and permission', (SELECT id FROM sources WHERE name='Shamba Guide local-knowledge research placeholder')),
  ((SELECT id FROM crops WHERE name='Bean'), 'Kirinyaga', 'Observe field drainage after the first sustained rains before selecting the bean plot.', 'Generic demonstration placeholder; no community endorsement claimed', 'awaiting community review and permission', (SELECT id FROM sources WHERE name='Shamba Guide local-knowledge research placeholder'));

INSERT OR IGNORE INTO input_records (crop_id, input_type, name, geographic_scope, certification_status, availability_status, guidance, source_id) VALUES
  ((SELECT id FROM crops WHERE name='Maize'), 'seed', 'Early-maturity maize seed category', 'Kenya demonstration counties', 'not verified by this demo', 'unknown; no live supplier inventory', 'Confirm the variety, lot label, maturity, and suitability with a qualified local supplier or extension officer.', (SELECT id FROM sources WHERE name='Shamba Guide demo input register')),
  ((SELECT id FROM crops WHERE name='Bean'), 'seed', 'Locally adapted clean bean seed category', 'Kenya demonstration counties', 'not verified by this demo', 'unknown; no live supplier inventory', 'Check traceability, variety identity, and current locally applicable seed guidance before purchase.', (SELECT id FROM sources WHERE name='Shamba Guide demo input register')),
  ((SELECT id FROM crops WHERE name='Potato'), 'seed', 'Traceable potato seed category', 'Highland demonstration counties', 'not verified by this demo', 'unknown; no live supplier inventory', 'Do not infer certification or stock from this record; confirm both with current authoritative sources.', (SELECT id FROM sources WHERE name='Shamba Guide demo input register')),
  ((SELECT id FROM crops WHERE name='Sorghum'), 'seed', 'Early-maturity sorghum seed category', 'Drier demonstration counties', 'not verified by this demo', 'unknown; no live supplier inventory', 'Confirm local adaptation, intended use, variety identity, and current availability before purchase.', (SELECT id FROM sources WHERE name='Shamba Guide demo input register'));


-- Consented case history, including clarifications and unavailable AI results.
-- The response/evidence snapshot is immutable through generic admin editing.
CREATE TABLE IF NOT EXISTS disease_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
