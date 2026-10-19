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

CREATE TABLE IF NOT EXISTS outbreaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    county TEXT NOT NULL,
    area TEXT NOT NULL,
    observed_period TEXT NOT NULL,
    report_summary TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    evidence_status TEXT NOT NULL DEFAULT 'simulated',
    coordinate_status TEXT NOT NULL DEFAULT 'manually_supplied'
);

CREATE UNIQUE INDEX IF NOT EXISTS treatments_seed_identity
ON treatments(disease_id, crop, geographic_scope, action, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS outbreaks_seed_identity
ON outbreaks(disease_id, county, area, observed_period, source_id);

INSERT OR IGNORE INTO sources (id, name, source_date, geographic_scope, evidence_status, limitations) VALUES
  (1, 'Shamba Guide demo disease reference', '2025-01-15', 'Kenya demonstration counties', 'simulated', 'Illustrative symptom matching only; not expert or laboratory validated.'),
  (2, 'Shamba Guide demo field history', '2024-10-01', 'Selected demonstration areas', 'simulated', 'Historical fictional records for interface testing; not evidence of a current outbreak.'),
  (3, 'Shamba Guide demo crop-care notes', '2025-01-15', 'Kenya demonstration counties', 'simulated', 'General non-chemical actions only; confirm locally with an extension officer.'),
  (4, 'Shamba Guide demo seasonal context', '2025-01-01', 'Selected demonstration counties', 'simulated', 'Simplified sample periods; actual rainfall and seasons vary by local conditions.');

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

INSERT OR IGNORE INTO outbreaks (disease_id, county, area, observed_period, report_summary, source_id) VALUES
  (2, 'Kiambu', 'Thika', 'April 2024', 'Simulated historical late blight-like observations used to demonstrate area matching.', 2),
  (4, 'Nakuru', 'Njoro', 'May 2024', 'Simulated historical leaf blight observations used to demonstrate area matching.', 2),
  (5, 'Kirinyaga', 'Kerugoya', 'November 2024', 'Simulated historical angular leaf spot-like observations used to demonstrate area matching.', 2);

