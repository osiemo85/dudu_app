CREATE TABLE IF NOT EXISTS animal_cases (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL, observation_json TEXT NOT NULL, result_json TEXT NOT NULL
);
