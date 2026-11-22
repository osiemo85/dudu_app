"""SQL for private conversations. Every conversation lookup is participant scoped."""
from typing import Any


def person(row) -> dict[str, Any]:
    return {key: row[key] for key in ("id", "name", "role", "county", "area")}


def conversation(connection, conversation_id: int, user_id: int):
    row = connection.execute(
        "SELECT * FROM expert_conversations WHERE id=? AND (user_id=? OR expert_id=?)",
        (conversation_id, user_id, user_id),
    ).fetchone()
    return dict(row) if row else None


def read_column(row: dict, user_id: int) -> str:
    # This row was already checked against the current participant.
    return "user_last_read_id" if row["user_id"] == user_id else "expert_last_read_id"


SUMMARY_QUERY = """
SELECT c.id,c.created_at,c.last_message_at,
 p.id participant_id,p.name participant_name,p.role participant_role,
 p.county participant_county,p.area participant_area,
 (SELECT substr(m.body,1,160) FROM expert_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) last_message,
 (SELECT COUNT(*) FROM expert_messages m WHERE m.conversation_id=c.id AND m.sender_id<>?
  AND m.id>CASE WHEN c.user_id=? THEN c.user_last_read_id ELSE c.expert_last_read_id END) unread_count
FROM expert_conversations c
JOIN users p ON p.id=CASE WHEN c.user_id=? THEN c.expert_id ELSE c.user_id END
WHERE (c.user_id=? OR c.expert_id=?)
"""


def _summary(row) -> dict:
    return {"id": row["id"], "participant": {key: row["participant_" + key] for key in ("id", "name", "role", "county", "area")},
            "created_at": row["created_at"], "last_message_at": row["last_message_at"],
            "last_message": row["last_message"], "unread_count": row["unread_count"]}


def summary(connection, row: dict, user_id: int) -> dict:
    record = connection.execute(SUMMARY_QUERY + " AND c.id=?", (user_id, user_id, user_id, user_id, user_id, row["id"])).fetchone()
    return _summary(record)


def summaries(connection, user_id: int, offset: int, limit: int) -> list[dict]:
    rows = connection.execute(SUMMARY_QUERY + " ORDER BY c.last_message_at DESC,c.id DESC LIMIT ? OFFSET ?",
                              (user_id, user_id, user_id, user_id, user_id, limit, offset)).fetchall()
    return [_summary(row) for row in rows]


def unread_total(connection, user_id: int) -> int:
    return connection.execute(
        """SELECT COUNT(*) AS total FROM expert_messages m
        JOIN expert_conversations c ON c.id=m.conversation_id
        WHERE m.sender_id<>? AND
        ((c.user_id=? AND m.id>c.user_last_read_id) OR
         (c.expert_id=? AND m.id>c.expert_last_read_id))""", (user_id, user_id, user_id)
    ).fetchone()["total"]
