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

Inputs: required user-confirmed crop, photo and/or symptoms, growth stage (optional), location, season/context, and clarifications. For photo-only submissions, the model must report visible symptoms before local database lookup. Results must distinguish a match in the limited local demo data from symptoms that did not match those records.

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

## 8. Opt-in OpenAI analysis and local case history

The explicitly requested live integration is OpenAI Agents SDK analysis via Responses,
enabled only by a server-side `OPENAI_API_KEY`. Agricultural evidence remains local and
simulated; no live weather, government, outbreak or supplier integration is implied.
The identification agent retrieves evidence through read-only tools and returns typed
possible matches. A separate officer-report agent prepares a review brief when the
farmer opts in. Roles have stable IDs and versions; executions have unique run IDs,
model names, timestamps and status. A unique workflow ID ties them to one submission.

The application validates final matches before writing history. With explicit expert
review consent it stores the original observations, optional photo/coordinates, resolved
context, findings, confidence, evidence provenance, disclaimer and agent audit metadata.
No-match, clarification and provider-failure cases must remain distinguishable. Only
completed AI matches create linked pending outbreak observations; these cannot imply
confirmed or current outbreaks. A reporting or save failure must not erase a completed
identification. Reviewers can inspect full case evidence and record their decision/notes.
Farmer submissions without consent must not be retained locally. Trace export is disabled;
coordinates are not sent to the models, and raw exchanges are not logged.

The disease workflow uses three separate roles. The photo-symptom agent returns a
one- or two-line description and visible symptoms. The database-search agent compares
those observations with any farmer-entered symptoms, chooses only exact supplied
observations, and uses those to search local records. The final-judge agent receives the
photo analysis and retrieved database evidence and selects only returned candidate IDs.
Each role has its own ID and run record. When no photo is supplied, the photo role is
skipped; written observations proceed to search and final review.

Pending AI outbreak reviews keep only the information needed for expert assessment on
the outbreak row: the analysis timestamp, local image path, image-agent description,
any farmer-entered symptoms, and the approval decision/comment. The detailed legacy
evidence JSON is not created for new reviews. An expert must provide a comment when
approving or rejecting an AI analysis.

## 9. Planting agent and test forecast

The planting form collects a county and area (or consented browser location) and
an explicitly selected local season with its month range. A planting agent uses
two read-only local tools: it finds candidate crops for the resolved area and
season, then checks each candidate's crop rain-duration requirement against the
area's seasonal forecast scenario. It returns at most two ranked options and
explains the comparison. The application validates tool use and candidate IDs;
missing evidence, configuration or agent failures produce clarification instead
of an invented ranking. Coordinates are not sent to the model or retained.
The editable crop rain requirements and `weather_forecasts` records are fictional,
dated test data; they do not provide current weather, verified crop requirements,
or the distribution of rainfall within the season. They require local review.

Planting results offer a plan and supplier listings for each returned crop. Plan
lookup matches the resolved area, season, and crop variety and shows ordered,
sourced management stages. Supplier listings match the same area and season
(or a season-unspecified listing) and a locally listed variety. Demo supplier
records do not establish current business details, prices or stock; missing plans
or listings are shown explicitly. Seeded stage examples are simulated and do not
contain pesticide prescriptions or invented fertilizer rates.

## 10. Saved planting plans and observations

Farmers may register or log in to save a selected crop, area, season and variety
plan as a snapshot with its stages and source. Precise GPS coordinates are not
saved. A signed-in user may view only their own saved plans and add dated or
undated notes categorized as land preparation, planting, crop management, disease,
weather, harvest or other. Notes are farmer observations, not validated diagnosis
or evidence. Accounts and records are stored locally for this demo; registration
does not verify the email address. The existing independent disease flow remains
available without an account.

Planting plans provide editable per-area, season and variety rain needs and
weeding counts, plus stage-relative timing, weather needs, input quantities per
acre and sourced non-chemical actions. Show the matched weather scenario and its
source alongside rain needs, without implying that rainy-month totals establish
rainfall distribution. Fixture timings and quantities are fictional test values
and must not be presented as field recommendations. Pesticide product instructions
and rates are not exposed without a verified, applicable source; the demo currently
excludes them. Saved snapshots retain the details available when saved.


## 11. Duducare navigation, farm assistant and PWA

The farmer interface is branded Duducare and follows the root `index.html`
reference: cream surfaces, forest green and harvest accents, compact cards,
five labeled mobile tabs and an adaptive laptop sidebar. Disease and planting
remain independently reachable without login. Personal histories still require
an authenticated account; admin operations retain their server-side role checks.

The farm chat is a **scripted demo assistant**, not a live model, expert, or
farmer messaging service. It uses editable local replies, asks for missing
location/season before discussing local planting, redirects diagnostic and
chemical questions safely, and returns the shared provenance/uncertainty fields.
It sends only the current question and selected area/season; it stores no chat
history on the server or browser. Earlier messages are visual conversation
history only and are not analysed. Leaving the page resets them.

My farm adds browser-local, labeled farmer observations by plot name, with
category, timestamp, search, export and confirmed deletion. It collects no GPS;
local notes are neither verified evidence nor synced records. Signed-in farmers
can also save growing-plan snapshots and notes through existing owned services.

The installable PWA registers its service worker in production on supported
secure origins. Only the offline explanation and brand icons are cached. Private
pages, API responses and uploaded evidence are never cached by the service worker.
Offline navigations display an explicit reconnect response; requests are not
silently queued, and no offline advice is generated.

The planting screen exposes an explicitly labeled rule-based local demo service
at `/api/v1/planting/demo-recommend`. The existing opt-in agent endpoint remains
separate and continues requiring a configured server-side API key.

## 12. Animal health, profile and language

Health is a shared entry point with independently usable crop and animal flows.
Animal health covers cattle, goats, sheep and chickens using editable simulated
symptom groups in `data/animal_health.json`. Warning signs trigger a veterinarian
referral message before species or symptom matching. This is a conservative demo
screen, not a clinically validated triage protocol; no warning selection must
never be presented as assurance of safety. No drugs, doses, vaccine schedules or
withdrawal periods are generated. The symptom categories require veterinarian
review before operational use. County and area are manually supplied; no precise
GPS is collected and no season-dependent animal advice is given.

The form collects species, group name, age group, structured signs, duration,
affected/total counts and optional veterinary history. Free text is retained as
farmer observations, not interpreted as diagnostic evidence. Photos are previewed
locally only and are not uploaded, analysed or persisted. Photo-only or missing
structured inputs produce clarification. Results contain shared context,
confidence, sources, limitations, next actions and a veterinarian review route.
Referral means a recommended action, not an appointment or message actually sent.

Saving requires a signed-in account and explicit storage consent. Animal cases
store the observation and result, with ownership checked for list and detail
access. Account name changes use authenticated, origin-checked PATCH /auth/me;
email and role cannot be changed through the profile form. A circle-only avatar
in the sidebar footer opens a compact, anchored account menu with the account
name at the top and Profile, Settings and Log out actions. The sidebar has no
promotional slogan or account-name strip. Profile links to `/profile` for account
editing; Settings links to `/settings` for device preferences. `/proflile` redirects
to `/profile`. The header provides the same avatar on mobile. Escape and outside
clicks dismiss the menu. Guests can change language on Settings; Profile prompts
for login when signed out.
Health uses two compact linked rows for the independent crop and animal flows,
with a visible simulated-evidence note.

English/Kiswahili is a device preference available before and after login. It
persists across navigation, reload and logout, and updates the document language.
Navigation, authentication controls, core form labels and animal intake/results
have authored translations. Existing agricultural evidence, stored case snapshots
and some older output text retain their original language, explicitly disclosed
in the Swahili interface. User-entered observations are never machine-translated.
