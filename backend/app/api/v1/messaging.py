from fastapi import APIRouter, Depends, Query
from app.models.user_plans import Account
from app.models.messaging import (
    ChatMessage, ChatPerson, Conversation, ConversationPage, MessageCreate,
    MessagePage, ReadMessages, StartConversation, UnreadMessages,
)
from app.services.accounts import current_user
from app.services import messaging
from app.api.v1.user_plans import check_origin

router = APIRouter(prefix="/messaging", tags=["expert messaging"])


@router.get("/experts", response_model=list[ChatPerson])
def experts(account: Account = Depends(current_user)):
    return messaging.experts(account.id)


@router.get("/unread", response_model=UnreadMessages)
def unread(account: Account = Depends(current_user)):
    return messaging.unread(account.id)


@router.get("/conversations", response_model=ConversationPage)
def conversations(offset: int = Query(default=0, ge=0), limit: int = Query(default=30, ge=1, le=100),
                  account: Account = Depends(current_user)):
    return messaging.conversations(account.id, offset, limit)


@router.post("/conversations", response_model=Conversation, status_code=201, dependencies=[Depends(check_origin)])
def start(data: StartConversation, account: Account = Depends(current_user)):
    return messaging.start(account.id, data.expert_id)


@router.get("/conversations/{conversation_id}/messages", response_model=MessagePage)
def messages(conversation_id: int, before_id: int | None = Query(default=None, gt=0),
             after_id: int | None = Query(default=None, ge=0), limit: int = Query(default=50, ge=1, le=100),
             account: Account = Depends(current_user)):
    return messaging.messages(account.id, conversation_id, limit, before_id, after_id)


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessage, status_code=201,
             dependencies=[Depends(check_origin)])
def send(conversation_id: int, data: MessageCreate, account: Account = Depends(current_user)):
    return messaging.send(account.id, conversation_id, data)


@router.post("/conversations/{conversation_id}/read", response_model=UnreadMessages, dependencies=[Depends(check_origin)])
def mark_read(conversation_id: int, data: ReadMessages, account: Account = Depends(current_user)):
    return messaging.mark_read(account.id, conversation_id, data.through_message_id)
