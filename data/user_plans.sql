CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL
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
CREATE INDEX IF NOT EXISTS saved_plans_user_id ON saved_plans(user_id, created_at);
CREATE INDEX IF NOT EXISTS plan_notes_plan_id ON plan_notes(saved_plan_id, created_at);
