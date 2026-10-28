-- Illustrative test data only. Values are fictional, dated 2025-01-15 and
-- have not been validated for farming, supplier availability, or climate.
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
);
CREATE TABLE IF NOT EXISTS management_stages (
 id INTEGER PRIMARY KEY, management_plan_id INTEGER NOT NULL REFERENCES management_plans(id),
 stage_order INTEGER NOT NULL CHECK(stage_order > 0), stage_name TEXT NOT NULL,
 duration_days INTEGER CHECK(duration_days > 0), description TEXT, weather_rain_needs TEXT,
 activities TEXT, UNIQUE(management_plan_id, stage_order)
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
-- SQLite treats NULLs as distinct in UNIQUE constraints.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_varieties_no_season ON supplier_varieties(supplier_id, variety_id) WHERE season_id IS NULL;
CREATE TABLE IF NOT EXISTS area_season_climate (
 id INTEGER PRIMARY KEY, area_id INTEGER NOT NULL REFERENCES areas(id), season_id INTEGER NOT NULL REFERENCES seasons(id),
 avg_rainfall_mm NUMERIC CHECK(avg_rainfall_mm >= 0), avg_temp_min NUMERIC, avg_temp_max NUMERIC,
 humidity_pct NUMERIC CHECK(humidity_pct BETWEEN 0 AND 100), notes TEXT, data_source TEXT NOT NULL,
 source_id INTEGER NOT NULL REFERENCES sources(id), UNIQUE(area_id, season_id),
 CHECK(avg_temp_min IS NULL OR avg_temp_max IS NULL OR avg_temp_min <= avg_temp_max)
);

INSERT OR IGNORE INTO sources (name, source_date, geographic_scope, evidence_status, limitations)
VALUES ('Planting relational test fixtures', '2025-01-15', 'Thika, Kiambu and Njoro, Nakuru', 'simulated', 'Fictional test data; not current climate, verified suitability, supplier inventory, pricing or agronomic advice. Coordinates are manually supplied test points.');
INSERT OR IGNORE INTO counties(name) VALUES ('Kiambu'), ('Nakuru');
INSERT OR IGNORE INTO areas(county_id,name,latitude,longitude) VALUES
 ((SELECT id FROM counties WHERE name='Kiambu'),'Thika',-1.0333,37.0693),
 ((SELECT id FROM counties WHERE name='Nakuru'),'Njoro',-0.3300,35.9500);
INSERT OR IGNORE INTO varieties(crop_id,name,maturity_days,yield_potential,description) VALUES
 ((SELECT id FROM crops WHERE name='Maize'),'Demo maize A',120,NULL,'Fictional cultivar for testing.'),
 ((SELECT id FROM crops WHERE name='Bean'),'Demo bean A',85,NULL,'Fictional cultivar for testing.');
INSERT OR IGNORE INTO area_season_varieties(area_id,season_id,variety_id,notes,source_id)
SELECT a.id,s.id,v.id,'Simulated suitability only; seek local validation.',src.id FROM areas a
JOIN counties c ON c.id=a.county_id JOIN seasons s ON s.county=c.name AND s.label='Long rains'
JOIN varieties v ON v.name IN ('Demo maize A','Demo bean A')
JOIN sources src ON src.name='Planting relational test fixtures' WHERE a.name='Thika';
INSERT OR IGNORE INTO management_plans(area_season_variety_id,title,overall_notes)
SELECT av.id,'Demo management plan','Fictional steps for testing; consult local extension advice.' FROM area_season_varieties av
JOIN varieties v ON v.id=av.variety_id WHERE v.name='Demo maize A';
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,duration_days,description,weather_rain_needs,activities)
SELECT id,1,'Land preparation',NULL,'Check drainage and prepare the field.', 'Confirm local conditions; no live forecast.', '["Check drainage", "Prepare seedbed"]' FROM management_plans WHERE title='Demo management plan';
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,duration_days,description,weather_rain_needs,activities)
SELECT id,2,'Planting',NULL,'Confirm locally appropriate seed and planting timing.', 'Confirm effective rainfall locally.', '["Check soil moisture", "Consult an extension officer"]' FROM management_plans WHERE title='Demo management plan';
INSERT OR IGNORE INTO inputs(name,unit,category) VALUES ('Demo seed','kg','Seed'),('Demo compost','kg','Organic matter');
INSERT OR IGNORE INTO stage_inputs(management_stage_id,input_id,quantity_per_acre,notes)
SELECT ms.id,i.id,NULL,'Quantity intentionally unspecified; obtain locally reviewed guidance.' FROM management_stages ms JOIN inputs i ON i.name='Demo seed' WHERE ms.stage_name='Planting';
INSERT OR IGNORE INTO suppliers(name,contact_phone,contact_email,area_id,description,is_verified)
VALUES ('Thika Agrovet','+254 000 000 001','thika@example.invalid', (SELECT a.id FROM areas a JOIN counties c ON c.id=a.county_id WHERE c.name='Kiambu' AND a.name='Thika'), 'Simulated supplier; no verified stock or contact.',0);
INSERT OR IGNORE INTO supplier_varieties(supplier_id,variety_id,season_id,price,unit,min_order_qty,notes)
SELECT sp.id,v.id,s.id,NULL,'kg',NULL,'Test listing only; price and stock unknown.' FROM suppliers sp JOIN varieties v ON v.name='Demo maize A' JOIN seasons s ON s.county='Kiambu' AND s.label='Long rains' WHERE sp.name='Thika Agrovet';
INSERT OR IGNORE INTO area_season_climate(area_id,season_id,avg_rainfall_mm,avg_temp_min,avg_temp_max,humidity_pct,notes,data_source,source_id)
SELECT a.id,s.id,400,15,26,70,'Fictional scenario, not a forecast or observed climate.','Planting relational test fixtures',src.id FROM areas a JOIN counties c ON c.id=a.county_id JOIN seasons s ON s.county=c.name AND s.label='Long rains' JOIN sources src ON src.name='Planting relational test fixtures' WHERE a.name='Thika';

-- Fictional ranges and seasonal scenarios solely for testing the ranking workflow.
CREATE TABLE IF NOT EXISTS crop_climate_requirements (
 crop_id INTEGER PRIMARY KEY REFERENCES crops(id), min_rainfall_mm NUMERIC NOT NULL,
 max_rainfall_mm NUMERIC NOT NULL, min_temp_c NUMERIC NOT NULL, max_temp_c NUMERIC NOT NULL,
 notes TEXT NOT NULL, source_id INTEGER NOT NULL REFERENCES sources(id),
 CHECK(min_rainfall_mm <= max_rainfall_mm AND min_temp_c <= max_temp_c)
);
INSERT OR IGNORE INTO crop_climate_requirements
SELECT id, 350, 600, 14, 28, 'Fictional test range; not validated crop requirements.', (SELECT id FROM sources WHERE name='Planting relational test fixtures') FROM crops WHERE name='Maize';
INSERT OR IGNORE INTO crop_climate_requirements
SELECT id, 300, 500, 15, 27, 'Fictional test range; not validated crop requirements.', (SELECT id FROM sources WHERE name='Planting relational test fixtures') FROM crops WHERE name='Bean';
INSERT OR IGNORE INTO crop_climate_requirements
SELECT id, 400, 700, 10, 22, 'Fictional test range; not validated crop requirements.', (SELECT id FROM sources WHERE name='Planting relational test fixtures') FROM crops WHERE name='Potato';
INSERT OR IGNORE INTO crop_climate_requirements
SELECT id, 200, 450, 18, 32, 'Fictional test range; not validated crop requirements.', (SELECT id FROM sources WHERE name='Planting relational test fixtures') FROM crops WHERE name='Sorghum';
INSERT OR IGNORE INTO counties(name) VALUES ('Kirinyaga'), ('Machakos');
INSERT OR IGNORE INTO areas(county_id,name,latitude,longitude) VALUES
 ((SELECT id FROM counties WHERE name='Kirinyaga'),'Kerugoya',-0.4989,37.2803),
 ((SELECT id FROM counties WHERE name='Machakos'),'Kangundo',-1.3034,37.3481);
INSERT OR IGNORE INTO area_season_climate(area_id,season_id,avg_rainfall_mm,avg_temp_min,avg_temp_max,humidity_pct,notes,data_source,source_id)
SELECT a.id,s.id,CASE WHEN c.name='Machakos' THEN 250 ELSE 450 END,CASE WHEN c.name='Machakos' THEN 18 ELSE 14 END,CASE WHEN c.name='Machakos' THEN 29 ELSE 24 END,NULL,'Fictional scenario, not a forecast or observed climate.','Planting relational test fixtures',src.id FROM areas a JOIN counties c ON c.id=a.county_id JOIN seasons s ON s.county=c.name JOIN sources src ON src.name='Planting relational test fixtures';

-- Area-specific demo candidates and forecast scenarios. These are fictional,
-- not a live forecast or evidence that a cultivar is suitable in a real field.
INSERT OR IGNORE INTO varieties(crop_id,name,description)
SELECT id, 'Demo ' || lower(name) || ' variety', 'Fictional test variety.' FROM crops;
INSERT OR IGNORE INTO area_season_varieties(area_id,season_id,variety_id,notes,source_id)
SELECT a.id,s.id,v.id,'Simulated candidate for testing; suitability not verified.',p.source_id
FROM areas a JOIN counties c ON c.id=a.county_id JOIN seasons s ON s.county=c.name
JOIN planting_calendars p ON p.county=c.name AND p.season_label=s.label
JOIN varieties v ON v.crop_id=p.crop_id AND v.name='Demo ' || lower((SELECT name FROM crops WHERE id=p.crop_id)) || ' variety';
INSERT OR IGNORE INTO sources (name,source_date,geographic_scope,evidence_status,limitations) VALUES ('Planting area forecast test fixtures','2025-01-15','Selected demonstration areas','simulated','Fictional scenarios for testing; not weather forecasts or observations.');
INSERT OR IGNORE INTO weather_forecasts(county,area,season_label,period,rainy_months,rainfall_context,planning_implication,source_id,evidence_status)
SELECT c.name,a.name,s.label,'2025 simulated scenario',CASE WHEN s.label='Long rains' THEN 4 ELSE 3 END,
 'Fictional test forecast, not current or observed weather.','Verify current local forecasts and rain onset.',src.id,'simulated'
FROM areas a JOIN counties c ON c.id=a.county_id JOIN seasons s ON s.county=c.name
JOIN sources src ON src.name='Planting area forecast test fixtures';

UPDATE weather_forecasts SET source_id=(SELECT id FROM sources WHERE name='Planting area forecast test fixtures') WHERE period='2025 simulated scenario' AND source_id=(SELECT id FROM sources WHERE name='Planting relational test fixtures');
INSERT OR IGNORE INTO sources (name,source_date,geographic_scope,evidence_status,limitations)
VALUES ('Planting crop rain test fixtures','2025-01-15','Selected demonstration areas','simulated','Fictional crop rain requirements for testing; not locally validated.');

-- Sample plans for each seeded candidate; no fertilizer rates or pesticide prescriptions.
INSERT OR IGNORE INTO management_plans(area_season_variety_id,title,overall_notes)
SELECT av.id, 'Demo plan: ' || c.name || ' / ' || v.name,
 'Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.'
FROM area_season_varieties av JOIN varieties v ON v.id=av.variety_id JOIN crops c ON c.id=v.crop_id
WHERE v.name LIKE 'Demo % variety' OR v.name IN ('Demo maize A','Demo bean A');
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,description,weather_rain_needs,activities)
SELECT id,1,'Land preparation','Inspect drainage and prepare a suitable seedbed.', 'Check field conditions and current local weather before working the soil.', '["Check drainage", "Prepare the seedbed"]'
FROM management_plans WHERE title LIKE 'Demo plan: %' AND overall_notes='Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.';
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,description,weather_rain_needs,activities)
SELECT id,2,'Planting','Confirm seed identity and planting timing with local guidance.', 'Wait for locally confirmed effective rainfall.', '["Check soil moisture", "Confirm seed and timing locally"]'
FROM management_plans WHERE title LIKE 'Demo plan: %' AND overall_notes='Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.';
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,description,weather_rain_needs,activities)
SELECT id,3,'Establishment','Check emergence and record field conditions.', 'Monitor soil moisture and drainage.', '["Check emergence", "Record field conditions"]'
FROM management_plans WHERE (title LIKE 'Demo plan: %' AND overall_notes='Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.') OR (title='Demo management plan' AND overall_notes='Fictional steps for testing; consult local extension advice.');
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,description,weather_rain_needs,activities)
SELECT id,4,'Crop management','Scout regularly and seek local advice on fertility and any pest concerns.', 'Watch for prolonged dry or waterlogged conditions.', '["Monitor crop health", "Ask an extension officer about local management"]'
FROM management_plans WHERE (title LIKE 'Demo plan: %' AND overall_notes='Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.') OR (title='Demo management plan' AND overall_notes='Fictional steps for testing; consult local extension advice.');
INSERT OR IGNORE INTO management_stages(management_plan_id,stage_order,stage_name,description,weather_rain_needs,activities)
SELECT id,5,'Harvest','Check maturity and plan safe handling and storage.', 'Consider current weather and drying conditions.', '["Check crop maturity", "Plan harvest and storage"]'
FROM management_plans WHERE (title LIKE 'Demo plan: %' AND overall_notes='Fictional plan for interface testing, dated 2025-01-15. Confirm each step with a local extension officer.') OR (title='Demo management plan' AND overall_notes='Fictional steps for testing; consult local extension advice.');

-- Fictional listings do not establish actual suppliers, prices, or stock.
INSERT OR IGNORE INTO suppliers(name,contact_phone,contact_email,area_id,description,is_verified)
SELECT a.name || ' Agrovet',
 CASE a.name WHEN 'Thika' THEN '+254 000 000 001' WHEN 'Njoro' THEN '+254 000 000 002' WHEN 'Kerugoya' THEN '+254 000 000 003' WHEN 'Kangundo' THEN '+254 000 000 004' END,
 CASE WHEN a.name IN ('Thika','Njoro','Kerugoya','Kangundo') THEN lower(a.name) || '@example.invalid' END,
 a.id,'Simulated supplier; no verified stock or contact.',0 FROM areas a;
INSERT OR IGNORE INTO supplier_varieties(supplier_id,variety_id,season_id,price,unit,min_order_qty,notes)
SELECT sp.id,av.variety_id,av.season_id,NULL,'kg',NULL,'Fictional test listing; price and stock unknown.'
FROM area_season_varieties av JOIN areas a ON a.id=av.area_id
JOIN suppliers sp ON sp.area_id=a.id AND sp.name=a.name || ' Agrovet'
JOIN varieties v ON v.id=av.variety_id
WHERE v.name LIKE 'Demo % variety' OR v.name IN ('Demo maize A','Demo bean A');
