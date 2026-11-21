from fastapi import APIRouter
from app.models.chat import ChatRequest, ChatResponse
from app.services.farm_chat import respond
router = APIRouter(prefix="/chat", tags=["farm chat"])

@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return respond(request)
