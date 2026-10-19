import base64
import json
from dataclasses import dataclass

from openai import OpenAI

from app.core.config import settings
from app.models.disease import DiseaseRequest
from app.services.disease_tools import TOOL_FUNCTIONS, TOOL_SCHEMAS


SYSTEM_PROMPT = """You are the evidence-retrieval agent for a Kenyan crop-health demonstration.
Use the available tools before answering. Retrieve candidate diseases first, then local outbreak history and supported treatment records for the candidate IDs.
Never state a definitive diagnosis, invent a pesticide rate, claim regulatory approval, or call a simulated historical record current.
Your final answer must be compact JSON with keys selected_disease_ids (up to 3 integers), confidence_level (low, medium, or high), confidence_explanation, and next_actions (an array of short strings).
Confidence describes how well the supplied observations match the demo evidence, not diagnostic certainty.
"""


@dataclass
class AgentResult:
    selected_disease_ids: list[int]
    confidence_level: str
    confidence_explanation: str
    next_actions: list[str]
    engine: str


def _client() -> tuple[OpenAI, str, str] | None:
    if settings.openrouter_api_key:
        return (
            OpenAI(base_url=settings.openrouter_base_url, api_key=settings.openrouter_api_key, timeout=60, max_retries=2),
            settings.openrouter_model,
            "openrouter_agent",
        )
    if settings.openai_api_key:
        return OpenAI(api_key=settings.openai_api_key, timeout=60, max_retries=2), settings.openai_model, "openai_agent"
    return None


def run_agent(request: DiseaseRequest, image: bytes | None, image_content_type: str | None) -> AgentResult | None:
    configured = _client()
    if not configured:
        return None
    client, model, engine = configured
    observation = {
        "crop": request.crop,
        "growth_stage": request.growth_stage,
        "symptoms": request.symptoms,
        "affected_part": request.affected_part,
        "spread_pattern": request.spread_pattern,
        "county": request.county,
        "area": request.area,
        "season": request.season,
    }
    content: list[dict] = [{"type": "text", "text": json.dumps(observation)}]
    if image and image_content_type:
        encoded = base64.b64encode(image).decode("ascii")
        content.append({"type": "image_url", "image_url": {"url": f"data:{image_content_type};base64,{encoded}", "detail": "low"}})
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": content}]
    required_tools = {"lookup_disease_candidates", "lookup_local_outbreak_history", "lookup_supported_treatments"}
    called_tools: set[str] = set()

    for _ in range(6):
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="required" if required_tools - called_tools else "auto",
            temperature=0,
        )
        message = response.choices[0].message
        messages.append(message.model_dump(exclude_none=True))
        if not message.tool_calls:
            raw = (message.content or "{}").strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
            payload = json.loads(raw)
            return AgentResult(
                selected_disease_ids=[int(value) for value in payload.get("selected_disease_ids", [])[:3]],
                confidence_level=payload.get("confidence_level", "low") if payload.get("confidence_level") in {"low", "medium", "high"} else "low",
                confidence_explanation=payload.get("confidence_explanation", "The agent returned limited matching evidence."),
                next_actions=payload.get("next_actions", [])[:4],
                engine=engine,
            )
        for tool_call in message.tool_calls:
            arguments = json.loads(tool_call.function.arguments)
            result = TOOL_FUNCTIONS[tool_call.function.name](**arguments)
            called_tools.add(tool_call.function.name)
            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})
    return None
