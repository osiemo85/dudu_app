# Functional Specifications

## 1. Purpose and scope

The Integrated Agricultural Advisory Demo explores two related but independently usable problems: (1) helping a farmer reason about a crop disease from a photo or symptoms, and (2) helping a farmer plan a crop around location, season, and locally relevant evidence. These are hypotheses to validate with farmers and stakeholders, not assumed requirements. The demo uses simulated, editable data; it does not claim live institutional integrations.

Stakeholder discovery should include farmers, extension officers, agro-vets, relevant government bodies, agricultural organizations, and custodians of datasets used by either module. Gather user stories, existing workflows, pain points, advice criteria, source availability, access conditions, and review needs before treating recommendations as operational.

## 2. Shared foundation

### Location

- In the farmer-facing app, request browser location with a clear explanation and explicit permission. Do not block the app if permission is refused.
- Allow manual location selection (at least county/area) as a fallback. Allow coordinate entry where necessary, with a clear explanation of precision and the ability to correct it.
- In the data-entry/admin workflow, contributors may choose coordinates manually for testing. Mark these records `test`/`manually_supplied`; never display them as verified farmer GPS observations.
- Show the location used by every location-aware result. Prompt the user to correct uncertain or mismatched locations.
- Do not retain precise farmer coordinates after the immediate request unless a later, explicit requirement and consent establish a need.

### Season and evidence

- Show the season or planning period applied and how it was selected. Permit correction where the user knows the intended season.
- Do not assume seasons are uniform across Kenya. Consider local rainfall pattern, agro-ecological zone, altitude, and dated area-specific calendars. Where applicable local data is absent or conflicts, ask a focused clarification and identify the gap.
- Attach provenance to each recommendation: source, record date/period, geographic scope, and validation status. Clearly distinguish simulated sample/history, user-entered observations, and verified external material.
- No external API or database is considered connected by default. Candidate sources need investigation for custodian, access method/API, license/permissions, coverage, update frequency, and validation process. Do not invent availability.

### Common response shape

Advisory responses include:

```json
{
  "location": {"label": "...", "coordinates": null, "source": "user_selected"},
  "season": {"label": "...", "period": "...", "basis": "..."},
  "sources": [{"name": "...", "date": "...", "geographic_scope": "...", "evidence_status": "simulated"}],
  "disclaimer": "...",
  "confidence": {"level": "low|medium|high", "explanation": "..."}
}
```

For a missing field, return an explicit unknown state or ask for clarification; do not fabricate data. Confidence describes support in the available evidence, not diagnostic certainty.

## 3. Disease Identification module

### User flow

1. Select crop and growth stage if known.
2. Provide a crop photo, symptom description, or both. Support camera capture and file upload on mobile and desktop.
3. Grant location or choose it manually. The module may accept an explicitly supplied area without precise coordinates if sufficient for the demo records.
4. Ask only clarifications that materially help distinguish likely causes (for example affected plant part, symptom onset, spread pattern, or recent weather where available).
5. Return a ranked set of possible causes, supporting observations, uncertainty, and recommended next information/action.

### Result requirements

- Describe results as possible matches, not a definitive diagnosis. If evidence is weak or image quality is poor, say so and request a clearer image or relevant symptom details.
- Include crop, location, season/context, candidate cause(s), confidence and explanation, matched evidence, and sources.
- Show outbreak context only when matching dated records exist for the relevant area and period. Label old or simulated reports and never imply a current outbreak from historical sample data.
- Show treatment options only when a trusted source record supports the crop, disease, geography, and use. Include source/date and instruct users to follow the locally applicable product label and seek qualified advice. Do not provide invented pesticide dosage or mixing directions.
- When an approved treatment source is unavailable or not verified, state that limitation and direct the user to a qualified extension officer or appropriate local authority. Do not label an input “approved” based on an unverified local record.
- Nearby agro-vet results and stock status are out of scope unless a current, verified source is actually available; simulated entries must be labeled as such.

### Inputs and acceptance criteria

Inputs: crop (optional if detectable but confirmable), photo and/or symptoms, growth stage (optional), location, season/context, and clarifications.

Accept when:

- User can submit photo, symptoms, or both and receive a structured response or a clear clarification request.
- Possible diagnoses are presented with uncertainty and relevant evidence.
- Location and season are visible and correctable; denied location permission has a manual fallback.
- Historical/simulated outbreak information is dated and labeled.
- Treatment recommendations expose provenance and do not imply approval or certainty unsupported by records.

## 4. Planting Advice module

### User flow

1. Choose or confirm location, then choose or confirm intended planting period/season.
2. Choose a crop or ask for suitable crop options. Ask about farm constraints only when they affect the recommendation (for example irrigation, soil/water limits, farm scale, or risk preference).
3. Review available local calendar, weather sample, extension guidance, input records, agro-ecological context, and indigenous knowledge records, each with provenance and date.
4. Receive a practical summary with what to plant, when, key steps, evidence gaps, and follow-up questions where essential context is missing.

### Decision criteria

Consider, where data exists and is suitable:

- Local planting calendar and agro-ecological zone.
- Seasonal/rainfall context and weather information, with period and status made explicit.
- Crop suitability and farmer preference/constraints.
- Locally available or certified inputs, but only with source, date, geographic coverage, and verified status; availability must not be inferred from certification alone.
- Extension-officer advice for the area and season.
- Indigenous/local knowledge with community/source attribution and permission as appropriate.

No criterion should be silently treated as authoritative. If key records are missing or contradictory, expose the gap and ask for the smallest useful clarification. A general suggestion may be given only if clearly labeled and appropriately cautious.

### Result and acceptance criteria

Return crop options or selected crop, suitable planting window, rationale, practical steps, relevant input/advice context, location, season, sources, confidence, and disclaimer. Make it clear when weather or input records are simulated, old, unavailable, or unverified.

Accept when:

- User can obtain guidance by location and season with an optional preferred crop.
- Location/season uncertainty causes a clear correction or clarification prompt.
- Output explains how local evidence influenced the advice and shows its dates and status.
- Missing live weather, input inventory, or extension records are disclosed rather than invented.
- The user can distinguish general guidance from advice grounded in a local dated record.

## 5. Shared clarification rules

- Ask a focused question when a missing answer could materially change the recommendation or safety.
- State briefly why the information matters and offer valid choices where possible.
- Do not ask for information already supplied; let users correct inferred values.
- If no clarification is available, return only a bounded general response, name the assumption, and explain what evidence is missing.
- Request location permission only when needed and explain its use. Manual selection remains available.

## 6. Simulated data, sources, and validation

Seed records should be illustrative, editable, dated, and geographically explicit. Each data group should define its source/provenance, evidence status, and limitations. Historical/sample data may support interface and decision-rule design; it must not be displayed as live advice.

Potential information custodians to investigate include relevant Kenyan agricultural and regulatory government bodies, county extension services, research and agricultural organizations, agro-vets/input suppliers, and farmer/community knowledge holders. This list identifies stakeholders to consult, not confirmed data providers or endorsements. Discovery should establish:

- Whether a suitable dataset/API exists and who maintains it.
- How access is obtained, terms/licensing, and whether redistribution is allowed.
- Geographic granularity, crop coverage, language, update cadence, and historical depth.
- Which authority validates disease/treatment and input certification claims.
- How extension officers and farmers review advice and report errors.

## 7. Non-goals for the demo

- Definitive laboratory or expert disease diagnosis.
- Unverified pesticide prescriptions or claims of regulatory approval.
- Live outbreak surveillance, weather forecasting, supplier inventory, or certification checks without a verified integration.
- A single planting calendar for all of Kenya.
- Automatic collection or long-term storage of precise farmer location.
