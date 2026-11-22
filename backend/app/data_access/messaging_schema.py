"""Additive, seed-free schema for private participant messaging and profile areas."""

PROFILE_COLUMNS = {"county": "TEXT", "area": "TEXT"}

MESSAGING_SQL = """
CREATE TABLE IF NOT EXISTS expert_conversations (
 id INTEGER PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expert_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL,
 last_message_at TEXT NOT NULL,
 user_last_read_id BIGINT NOT NULL DEFAULT 0 CHECK(user_last_read_id >= 0),
 expert_last_read_id BIGINT NOT NULL DEFAULT 0 CHECK(expert_last_read_id >= 0),
 UNIQUE(user_id, expert_id), CHECK(user_id <> expert_id)
);
CREATE TABLE IF NOT EXISTS expert_messages (
 id INTEGER PRIMARY KEY,
 conversation_id BIGINT NOT NULL REFERENCES expert_conversations(id) ON DELETE CASCADE,
 sender_id BIGINT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 client_message_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(conversation_id, sender_id, client_message_id)
);
CREATE INDEX IF NOT EXISTS expert_conversations_user ON expert_conversations(user_id, last_message_at);
CREATE INDEX IF NOT EXISTS expert_conversations_expert ON expert_conversations(expert_id, last_message_at);
CREATE INDEX IF NOT EXISTS expert_messages_conversation ON expert_messages(conversation_id, id);
"""


def initialize_messaging_schema(connection, *, postgres: bool) -> None:
    from app.data_access.database import _postgres_script, _split_sql

    if postgres:
        columns = {row[0] for row in connection.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='users'"
        )}
    else:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
    for name, definition in PROFILE_COLUMNS.items():
        if name not in columns:
            connection.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")
    translate = _postgres_script if postgres else _split_sql
    for statement in translate(MESSAGING_SQL):
        connection.execute(statement)
    if postgres:
        # Preserve full PostgreSQL identity values in references, including
        # databases initialized by an earlier development version of this schema.
        for table, references in {"expert_conversations": {"user_id", "expert_id"},
                                  "expert_messages": {"conversation_id", "sender_id"}}.items():
            columns = connection.execute(
                "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=%s",
                (table,),
            ).fetchall()
            for column, kind in columns:
                if column in references and kind == "integer":
                    connection.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE BIGINT")
