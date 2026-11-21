import json
import re
from pathlib import Path
from app.models.chat import ChatRequest, ChatResponse
from app.models.common import Confidence, SourceRecord, LocationContext
from app.models.planting import PlantingRequest
from app.services.context import resolve_context

GUIDE_PATH = Path(__file__).resolve().parents[3] / "data" / "chat_guidance.json"

def respond(request: ChatRequest) -> ChatResponse:
    guide = json.loads(GUIDE_PATH.read_text())
    location, season, _, season_record = resolve_context(PlantingRequest(county=request.county, area=request.area, season=request.season))
    if not request.county or not request.area:
        location = LocationContext(label="Unknown", county=request.county, area=request.area, source="unknown", correction_note="Choose both county and area; no local area has been assumed.")
    message = request.message.lower()
    if request.language == "sw":
        synonyms = {"dawa":"pesticide", "dozi":"dose", "mvua":"rain", "hali ya hewa":"weather", "kupanda":"plant", "nipande":"plant", "majani":"leaves", "madoa":"spot", "shamba":"farm", "kumbukumbu":"record"}
        message += " " + " ".join(english for swahili, english in synonyms.items() if swahili in message)
    topic = next((topic for topic in guide["topics"] if any(re.search(r"\b" + re.escape(word) + r"\b", message) for word in topic["keywords"])), None)
    action = topic["action"] if topic else None
    status = "general_guidance"
    reply = topic["reply"] if topic else "I can help you navigate crop health, planting, weather evidence, and farm notes. What crop are you working with, and what would you like to understand? This demo uses scripted replies; I cannot assess arbitrary questions or arrange a conversation with a real advisor."
    # Keep chemical and weather limitations visible even without context.
    if action == "planting" and "weather" not in message and not any(word in message for word in ("rain", "forecast", "drought")):
        if not request.county or not request.area or location.source == "unknown":
            status = "needs_clarification"
            reply = "Which county and area are you planting in? Select them under Local context above. Local rainfall patterns and available demo records differ by area. I will not choose a location for you."
        elif season.label == "Unknown" or season_record is None:
            status = "needs_clarification"
            reply = "Which local season are you planning for? Select a listed season under Local context above. Planting windows vary by area and season; I will not assume a national calendar."
    if request.subject == "animals":
        action = "animal-health"
        status = "general_guidance"
        reply = "Open Animal health to select the species, observed signs, duration and number affected. Check warning signs first and contact a veterinarian if concerned. This scripted chat cannot diagnose animals or recommend medicines or doses."
    if request.language == "sw":
        if action == "animal-health":
            reply = "Fungua Afya ya mifugo kuchagua aina ya mnyama, dalili, muda na idadi iliyoathirika. Kagua dalili za hatari kwanza na wasiliana na daktari wa mifugo ukiwa na wasiwasi. Mazungumzo haya ya majaribio hayatambui ugonjwa wala kupendekeza dawa au dozi."
        elif status == "needs_clarification":
            reply = "Chagua kaunti, eneo na msimu katika Taarifa za eneo kisha utume tena. Taarifa hizi zinahitajika kulinganisha rekodi za eneo; hakuna msimu wa kitaifa unaodhaniwa."
        elif action == "disease":
            reply = "Fungua Afya ya mimea, chagua mmea na ueleze dalili. Dalili zinaweza kuwa na sababu nyingi. Mazungumzo haya hayatoi utambuzi au maagizo ya dawa na dozi. Muulize afisa ugani kuthibitisha kabla ya kuchagua bidhaa."
        elif action == "planting":
            reply = "Fungua Upandaji na uchague eneo na msimu. Rekodi za hali ya hewa ni za majaribio, si utabiri wa sasa. Kagua tarehe, vyanzo na mapungufu kisha uthibitishe ushauri na afisa ugani."
        elif action == "farms":
            reply = "Tumia Shamba langu kuandika uchunguzi wako kwa tarehe. Maandishi ni ya mtumiaji, si ushauri uliothibitishwa. Kumbukumbu za kifaa hazisawazishwi kwenye vifaa vingine."
        else:
            reply = "Ninaweza kukuelekeza kwenye Afya ya mimea, Afya ya mifugo, Upandaji na kumbukumbu. Chagua mada hapo juu. Haya ni majibu ya majaribio, si mazungumzo na mtaalamu."
    return ChatResponse(status=status, reply=reply, action=action, location=location, season=season,
        sources=[SourceRecord(**guide["source"])], confidence=Confidence(level="low", explanation="Scripted navigation and general guidance only; no assessment of this farm or diagnosis was performed."),
        disclaimer="Simulated farm assistant. No live advisor, weather, stock, or community messaging is connected. Confirm field decisions with a qualified extension officer.")
