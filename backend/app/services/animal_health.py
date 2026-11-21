import json
from datetime import UTC, datetime
from pathlib import Path
from fastapi import HTTPException
from app.models.animal_health import AnimalRequest, AnimalResponse, AnimalPossibility, AnimalCase
from app.models.common import LocationContext, SeasonContext, SourceRecord, Confidence
from app.data_access.database import database

DATA = Path(__file__).resolve().parents[3] / 'data' / 'animal_health.json'

def assess(request: AnimalRequest) -> AnimalResponse:
    data = json.loads(DATA.read_text())
    def t(en, sw): return sw if request.language == 'sw' else en
    location = LocationContext(label=', '.join(filter(None, [request.area, request.county])) or t('Unknown', 'Haijulikani'), county=request.county, area=request.area, source='user_selected' if request.county else 'unknown')
    result = AnimalResponse(status='needs_clarification', urgency='undetermined', species=request.species, possibilities=[], clarification=None,
        next_actions=[t('Ask a veterinarian to examine the affected animals. This tool does not book or send a referral.', 'Wasiliana na daktari wa mifugo achunguze wanyama. Zana hii haitumi maombi kwa daktari.'), t('Record when signs began, the number affected, feeding changes, vaccination history and new arrivals.', 'Andika dalili zilipoanza, idadi iliyoathirika, mabadiliko ya lishe, historia ya chanjo na wanyama wapya.')],
        location=location, season=SeasonContext(label=t('Not applicable', 'Haihusiki'), period=None, basis=t('No season-dependent animal recommendation is made.', 'Hakuna pendekezo la mifugo linalotegemea msimu.')),
        sources=[SourceRecord(**data['source'])], confidence=Confidence(level='low', explanation=t('Only simulated symptom groups are compared. A veterinary examination and possibly laboratory tests are needed.', 'Vikundi vya dalili vya majaribio pekee vinalinganishwa. Uchunguzi wa daktari wa mifugo na pengine vipimo vinahitajika.')),
        disclaimer=t('Simulated guidance, not a veterinary diagnosis. No medicine, dose, withdrawal period, outbreak or vaccine recommendation is provided. No selection of warning signs means safety has not been established.', 'Mwongozo wa majaribio, si utambuzi wa daktari. Hakuna mapendekezo ya dawa, dozi, muda wa kusubiri, mlipuko au chanjo. Kutokuchagua dalili za hatari hakuthibitishi usalama.'),
        photo_analysis=t('Photos are previewed on your device only; they are not uploaded, analysed or saved.', 'Picha zinaonyeshwa kwenye kifaa chako tu; hazitumwi, hazichambuliwi wala kuhifadhiwa.'))
    if request.warning_signs:
        result.status='urgent_referral'; result.urgency='contact_vet_now'
        result.next_actions.insert(0,t('Contact a veterinarian or county veterinary service now about the warning signs you reported. Do not wait for a possible disease match.', 'Wasiliana sasa na daktari wa mifugo au huduma ya mifugo ya kaunti kuhusu dalili za hatari ulizoripoti. Usisubiri matokeo ya ugonjwa.'))
        return result
    if not request.warning_check:
        result.clarification=t('Check the warning-sign questions first. If unsure about an animal’s condition, contact a veterinarian.', 'Jibu maswali ya dalili za hatari kwanza. Ikiwa huna uhakika, wasiliana na daktari wa mifugo.')
    elif not request.species:
        result.clarification=t('Which animal species is affected?', 'Ni aina gani ya mnyama imeathirika?')
    elif not request.symptoms:
        result.clarification=t('Select the signs you can observe. Free text and photos are not interpreted by this demo; if none fit, ask a veterinarian.', 'Chagua dalili unazoziona. Maandishi na picha hazichambuliwi na onyesho hili; kama hakuna inayofaa, muulize daktari wa mifugo.')
    elif request.duration_days is None:
        result.clarification=t('How many days have you noticed these signs? Use 0 for today.', 'Umeona dalili hizi kwa siku ngapi? Weka 0 ikiwa zimeanza leo.')
    else:
        result.possibilities=[AnimalPossibility(id=row['id'], name=row[request.language], matched_symptoms=sorted(set(row['symptoms']) & set(request.symptoms))) for row in data['groups'] if request.species in row['species'] and set(row['symptoms']) & set(request.symptoms)]
        result.urgency='veterinary_review_needed'
        if result.possibilities: result.status='possible_matches'
        else: result.clarification=t('No simulated group fits these observations for this species. Ask a veterinarian for an assessment.', 'Hakuna kikundi cha majaribio kinacholingana na dalili kwa aina hii. Omba uchunguzi wa daktari wa mifugo.')
    return result

def save_case(user_id: int, observation: AnimalRequest, consent: bool) -> AnimalCase:
    if not consent: raise HTTPException(400, 'Explicit consent is required to save an animal case.')
    result=assess(observation)
    # No photos or precise coordinates are accepted or retained.
    now=datetime.now(UTC).isoformat()
    with database() as conn:
        cursor=conn.execute('INSERT INTO animal_cases(user_id,created_at,observation_json,result_json) VALUES (?,?,?,?)', (user_id,now,observation.model_dump_json(),result.model_dump_json()))
        return AnimalCase(id=cursor.lastrowid,created_at=now,observation=observation,result=result)

def list_cases(user_id: int) -> list[AnimalCase]:
    with database() as conn:
        rows=conn.execute('SELECT * FROM animal_cases WHERE user_id=? ORDER BY id DESC', (user_id,)).fetchall()
    return [AnimalCase(id=row['id'],created_at=row['created_at'],observation=json.loads(row['observation_json']),result=json.loads(row['result_json'])) for row in rows]
