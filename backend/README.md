# FastAPI backend

Install and run with `uv` from this directory:

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env
uv sync
uv run uvicorn app.main:app --reload
```

The disease form and API require the user to select the crop. The service uses the OpenAI Agents SDK and Responses API when `OPENAI_API_KEY`
is set. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. OpenRouter is no longer selected.
With no OpenAI key, the bounded symptom-table matcher remains available and reports
that uploaded images were not interpreted. With an image, three separate agents run:
one describes visible symptoms in one or two lines, a search agent compares those
symptoms with any farmer description and queries local records using only selected
observations, and a judge reviews the image analysis and database evidence before
choosing possible matches. Each role has its own run ID. The result distinguishes a
local record match, no sufficiently supported match, and a photo too unclear to search.
Restart FastAPI after configuration changes.

For local workflow inspection, set `AGENT_DEBUG_OUTPUT=true` in `backend/.env` and
restart FastAPI. The terminal prints labelled prompt, input, and structured output for
the photo-analysis, database-search, final-judge, and optional officer-report agents.
Image bytes and precise coordinates are omitted from those logs.

The disease response includes `engine` and `analysis` (`status`,
`image_analyzed`, and a safe explanatory `message`). The UI displays these so a
failed AI request cannot be mistaken for successful photo analysis. A photo-only
request asks for written symptoms when AI is unavailable; it does not produce a
disease from the uploaded file alone. Written symptoms can still use local demo
matching, with the AI failure shown explicitly.

If the UI reports a rejected API key, replace the selected provider's key in
`backend/.env` and restart FastAPI. Environment variables exported by the shell
take precedence over `.env`; check those if replacing the file value has no
effect. Other failures distinguish quota/rate limits, connection failures, and
rejected provider requests. Server logs show the exception type and HTTP status,
without printing provider error bodies or credentials. A running backend must
be restarted after changing `.env`.

The first API start creates `../data/advisory.db` from `../data/seed.sql`.
The SQLite database is persistent and editable through `/api/v1/admin/*` or the
admin UI. Seed records are simulated and are not live government, outbreak,
weather, supplier, or regulatory data.

## Nearby agrovet directory

After a disease result includes possible matches, the UI can request
`GET /api/v1/disease/nearby-agrovets` with the resolved `county`, `area`, and one or
more `disease_id` values from that result. It reads the editable `agrovets` table and
returns area-matched directory entries with a treatment/service label, indicative cost,
and phone number. The records are simulated: they do not confirm business details,
distance, stock, current price, product approval, or treatment suitability.

The frontend checks `http://localhost:8000/api/v1/health` by default. Set
`FASTAPI_URL` for the server-rendered health check and
`NEXT_PUBLIC_FASTAPI_URL` for browser requests when using another API origin.

The planting module is available under `/api/v1/planting/`. Its agent uses the
OpenAI API and local simulated crop and weather records; an API key is required.

## Expert-review observations

When a farmer opts in, the service saves a `disease_cases` snapshot after validation:
original observations, resolved context, all candidates, confidence, image observations,
sources, disclaimer, optional image/coordinates, and a unique workflow ID. Separate
`crop-disease-identification` and `crop-disease-officer-report` agents record role/version,
unique run ID, model, timestamps, and completion/failure status. The officer agent
returns a structured brief with evidence gaps, follow-up questions and suggested review
priority. Report failure preserves the completed identification and its history.

Successful matches create a linked `outbreaks` record with `expert_approval: pending`.
Clarifications and AI failures are stored without asserting an outbreak. Submission
and symptom-onset dates are distinct; unknown onset is never invented. Review a case
at `/api/v1/admin/crop-health/disease_cases` or in the crop-health admin UI; only
`expert_approval` and `expert_review_note` can be edited. Case review updates the linked
outbreak status. Images are available from the case's `/image` endpoint. This local
admin demo has no authentication; do not expose consented records publicly.

No review consent means no local case, image or coordinate retention. Models never
receive precise coordinate fields. SDK trace export is disabled, Responses storage is
disabled, and raw prompts/provider error bodies are excluded from application logs.
The IDs shown in local history are application audit IDs, not hosted trace IDs.

Dependencies are locked with `uv.lock`. `openai==2.36.0` is pinned for compatibility
with `openai-agents` 0.17.8: newer clients tested here required token-usage fields the
Agents SDK did not construct. Upgrade the pair together and run the SDK transport tests.

Run `uv run python -m unittest discover -s tests`. Tests exercise the real SDK loop
against mocked Responses HTTP traffic, including image input, structured tool calls,
review consent, distinct runs, unknown IDs, no matches, report failures, persistence
failures, and the independent planting endpoint. No test sends data to a live provider.

## Planting test tables

Startup also applies `data/planting_tables.sql` to new and existing databases. It
adds counties, areas, varieties, area/season suitability, management plans and
stages, inputs, suppliers, supplier varieties, and seasonal climate tables. The
existing `seasons` table remains county-specific and `crops` retains its existing
fields; both have additional fields for the requested model. The new tables are
editable in SQLite and are separate from the existing planting advisory data flow.
The SQL fixtures are fictional, dated 2025-01-15, and linked to a simulated
source; the manually supplied area coordinates, climate values, supplier listing
and management steps are for testing only. They do not establish actual suitability,
weather, prices, stock, or input rates. Restart the backend to initialize them.

The planting endpoint now uses the OpenAI Agents SDK when `OPENAI_API_KEY` is
configured. It calls two read-only tools: an area/season crop lookup and a
per-crop area/season forecast lookup. It validates that all candidates were
checked before showing up to two ranked crops. If the agent is unavailable, it
returns a clarification instead of silently generating a deterministic ranking.
`weather_forecasts` contains fictional scenarios, not live forecasts; crop rain
requirements are fictional as well. The startup migration renames an existing
`weather_samples` table without deleting its rows. Use the editable `crops` and
`weather_forecasts` admin tables to change these inputs.

After planting recommendations, each crop can open an area/season-specific
planting plan or supplier listings. `GET /api/v1/planting/crops/{crop_id}/details`
requires `county`, `area`, and `season`. It matches plans and listings through
area, season and variety records; missing matches return empty lists. The seeded
plans and supplier listings are fictional examples, dated 2025-01-15 for plans;
contact, price and stock are unverified. They are editable in the planting admin.
