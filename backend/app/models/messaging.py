from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ChatPerson(BaseModel):
    id: int
    name: str
    role: str
    county: str | None = None
    area: str | None = None


class StartConversation(BaseModel):
    expert_id: int = Field(gt=0)


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    client_message_id: UUID

    @field_validator("body")
    @classmethod
    def nonempty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter a message.")
        return value


class ChatMessage(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    client_message_id: str
    created_at: str


class Conversation(BaseModel):
    id: int
    participant: ChatPerson
    created_at: str
    last_message_at: str
    last_message: str | None
    unread_count: int


class ConversationPage(BaseModel):
    items: list[Conversation]
    total: int
    offset: int
    limit: int


class MessagePage(BaseModel):
    conversation: Conversation
    messages: list[ChatMessage]
    has_earlier: bool
    has_more: bool


class ReadMessages(BaseModel):
    through_message_id: int = Field(gt=0)


class UnreadMessages(BaseModel):
    unread_count: int
