"""Participant-only expert messaging; read progress is explicit and monotonic."""
from datetime import UTC, datetime

from fastapi import HTTPException

from app.data_access.database import database, using_postgres
from app.data_access import messaging_repository as repository
from app.models.messaging import (
    ChatMessage, ChatPerson, Conversation, ConversationPage, MessageCreate,
    MessagePage, UnreadMessages,
)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _owned(connection, conversation_id: int, user_id: int) -> dict:
    row = repository.conversation(connection, conversation_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return row


def experts(user_id: int) -> list[ChatPerson]:
    # Admins are the expert-review accounts in the current demo. Listing does not
    # establish professional credentials, availability or institutional approval.
    with database() as connection:
        rows = connection.execute(
            "SELECT id,name,role,county,area FROM users WHERE role='admin' AND id<>? ORDER BY name,id",
            (user_id,),
        ).fetchall()
    return [ChatPerson(**repository.person(row)) for row in rows]


def start(user_id: int, expert_id: int) -> Conversation:
    if user_id == expert_id:
        raise HTTPException(status_code=422, detail="Choose another expert to start a conversation.")
    with database() as connection:
        expert = connection.execute("SELECT id FROM users WHERE id=? AND role='admin'", (expert_id,)).fetchone()
        if not expert:
            raise HTTPException(status_code=404, detail="Expert not found.")
        now = _now()
        connection.execute(
            """INSERT INTO expert_conversations(user_id,expert_id,created_at,last_message_at)
            VALUES (?,?,?,?) ON CONFLICT(user_id,expert_id) DO NOTHING""", (user_id, expert_id, now, now)
        )
        row = dict(connection.execute(
            "SELECT * FROM expert_conversations WHERE user_id=? AND expert_id=?", (user_id, expert_id)
        ).fetchone())
        return Conversation(**repository.summary(connection, row, user_id))


def conversations(user_id: int, offset: int, limit: int) -> ConversationPage:
    with database() as connection:
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM expert_conversations WHERE user_id=? OR expert_id=?", (user_id, user_id)
        ).fetchone()["total"]
        items = [Conversation(**row) for row in repository.summaries(connection, user_id, offset, limit)]
    return ConversationPage(items=items, total=total, offset=offset, limit=limit)


def messages(user_id: int, conversation_id: int, limit: int, before_id: int | None, after_id: int | None) -> MessagePage:
    if before_id is not None and after_id is not None:
        raise HTTPException(status_code=422, detail="Use either an earlier or a newer message cursor.")
    with database() as connection:
        row = _owned(connection, conversation_id, user_id)
        query = "SELECT * FROM expert_messages WHERE conversation_id=?"
        values = [conversation_id]
        if before_id is not None:
            query += " AND id<?"
            values.append(before_id)
        if after_id is not None:
            query += " AND id>?"
            values.append(after_id)
        query += " ORDER BY id " + ("ASC" if after_id is not None else "DESC") + " LIMIT ?"
        records = [dict(item) for item in connection.execute(query, (*values, limit + 1)).fetchall()]
        has_more = len(records) > limit
        records = records[:limit]
        if after_id is None:
            records.reverse()
        earlier = bool(records and connection.execute(
            "SELECT 1 FROM expert_messages WHERE conversation_id=? AND id<? LIMIT 1", (conversation_id, records[0]["id"])
        ).fetchone())
        return MessagePage(conversation=Conversation(**repository.summary(connection, row, user_id)),
                           messages=[ChatMessage(**item) for item in records], has_earlier=earlier,
                           has_more=has_more if after_id is not None else False)


def send(user_id: int, conversation_id: int, data: MessageCreate) -> ChatMessage:
    with database() as connection:
        _owned(connection, conversation_id, user_id)
        if using_postgres():
            # Serialize inserts within a conversation so read cursors cannot
            # skip a lower message ID whose transaction has not committed yet.
            connection.execute("SELECT id FROM expert_conversations WHERE id=? FOR UPDATE", (conversation_id,))
        key = str(data.client_message_id)
        now = _now()
        cursor = connection.execute(
            """INSERT INTO expert_messages(conversation_id,sender_id,body,client_message_id,created_at)
            VALUES (?,?,?,?,?) ON CONFLICT(conversation_id,sender_id,client_message_id) DO NOTHING""",
            (conversation_id, user_id, data.body, key, now),
        )
        if cursor.rowcount:
            connection.execute("UPDATE expert_conversations SET last_message_at=? WHERE id=?", (now, conversation_id))
        message = connection.execute(
            "SELECT * FROM expert_messages WHERE conversation_id=? AND sender_id=? AND client_message_id=?",
            (conversation_id, user_id, key),
        ).fetchone()
        if message["body"] != data.body:
            raise HTTPException(status_code=409, detail="This message identifier was already used. Start a new message.")
        return ChatMessage(**dict(message))


def mark_read(user_id: int, conversation_id: int, through_message_id: int) -> UnreadMessages:
    with database() as connection:
        row = _owned(connection, conversation_id, user_id)
        if not connection.execute(
            "SELECT 1 FROM expert_messages WHERE id=? AND conversation_id=?", (through_message_id, conversation_id)
        ).fetchone():
            raise HTTPException(status_code=422, detail="The read marker must reference a message in this conversation.")
        column = repository.read_column(row, user_id)
        connection.execute(
            f"UPDATE expert_conversations SET {column}=CASE WHEN {column}<? THEN ? ELSE {column} END WHERE id=?",
            (through_message_id, through_message_id, conversation_id),
        )
        return UnreadMessages(unread_count=repository.unread_total(connection, user_id))


def unread(user_id: int) -> UnreadMessages:
    with database() as connection:
        return UnreadMessages(unread_count=repository.unread_total(connection, user_id))
