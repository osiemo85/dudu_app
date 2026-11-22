# FastAPI backend

Install and run with `uv` from this directory:

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env
# Add DATABASE_URL from Supabase Connect.
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Supabase PostgreSQL

Set `DATABASE_URL` in `backend/.env` to the PostgreSQL connection string from
Supabase **Connect** for `ENV=dev` (the default). This setting is required: the app does not select SQLite
or create a local database implicitly. Prefer Supabase's pooler
connection string for serverless or IPv4-only environments, and retain the
required `sslmode=require` query parameter when Supabase provides it.

For `ENV=prod`, configure all four backend-only settings instead:

```dotenv
ENV=prod
SUPABASE_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?sslmode=require
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=disease-photos
```

The database string comes from **Connect → Direct**; use the session pooler for
an IPv4-only persistent backend, or direct connection where IPv6 is available.
`SUPABASE_URL` is the HTTPS project URL from **Connect → Framework**. The secret
key comes from **Settings → API Keys** and must never reach the frontend.
Production ignores `DATABASE_URL` and requires the Supabase database, HTTPS URL,
secret key and bucket. Alembic uses the same resolved database with psycopg 3.
Keep `FRONTEND_URL` configured separately with the deployed frontend origin.

Create the bucket under **Storage** with Public disabled, a 10 MB file limit and
`image/jpeg`, `image/png`, `image/webp` allowed types. No public-access policy is
needed: the backend checks administrator access and proxies private photos.
Production checks bucket privacy before upload/read and never falls back to disk.
Only expert-review consent enables crop photo uploads. Stored references use
`supabase://bucket/disease-cases/<random-id>.<extension>` in the existing
`image_path` column; no photo schema migration is needed. An upload/database
failure reports a failed save without erasing the result. Database failures
trigger best-effort photo deletion; reconcile the bucket if cleanup logs a warning.
Existing disk photos are not automatically uploaded; production will show those
legacy photos as unavailable. Animal photos remain device-only previews.

The integration is covered with mocked Storage HTTP responses. Verify the target
project before deployment: run schema migrations, create an administrator,
submit a crop photo with expert-review consent, confirm the bucket object exists,
then open it from the admin case and outbreak screens. Check that a signed-out
photo request is denied and a submission without consent creates no object.
Also run the independent planting sample in the root README. Automated tests do
not contact a real Supabase project or validate deployment credentials.

## Empty database and manual disease testing

Startup creates empty tables using `app/data_access/schema.py`, bundled with the
backend Python source. It never needs `/var/data/seed.sql` or any other local
fixture file. Revision `20261122_01` creates the same empty schema when running
`uv run alembic upgrade head`. Existing records and contributor edits remain
intact. Migrations and default startup insert no agricultural sample records.

Keep `LOAD_DEMO_SEED=false` (the default). Enabling it is rejected with
`ENV=prod` or on Vercel. The five legacy fixture SQL files under `data/` are
ignored by Git and retained locally only. A fresh checkout does not contain
them. The optional local loader/exporter is not part of hosted setup.

After creating an administrator with `uv run python scripts/create_admin.py`,
follow the [disease UI test guide](../docs/DISEASE_UI_TEST_GUIDE.md) to add dated,
simulated sources, context, symptoms, and optional historical/directory records
through the UI. The guide requires no SQL inserts or seed uploads.

In Vercel, deploy the backend from the `backend` Root Directory. Set its
`FRONTEND_URL=https://dudu-app-f.vercel.app` and the production Supabase values
above. Set the frontend project's
`BACKEND_URL=https://dudu-app-nine.vercel.app` and redeploy it. Health must
return JSON with HTTP 200; signed-out `/api/v1/auth/me` must return JSON 401.

Run the seed-free manual-entry flow checks:

```bash
uv run python -m unittest discover -s tests -p test_manual_disease.py -v
```

To run PostgreSQL connection and optional local-fixture tests, set `TEST_POSTGRES_DATABASE_URL`
to a test database, then run:

```bash
uv run python -m unittest discover -s tests -p 'test_postgres*.py' -v
```

These tests create and remove isolated temporary schemas; the database user
needs permission to create schemas.

The PostgreSQL adapter reads inserted IDs from `RETURNING` rows. Session rows
use a token key and have no generated ID; registration and login must not call
PostgreSQL's session-wide `LASTVAL()` for these inserts.

Apply tracked migrations:

```bash
uv run alembic upgrade head
```

Alembic tracks structural schema changes in `backend/alembic/versions/`. The
optional private simulated fixtures remain ignored in `data/`; do not use migrations to replace
contributor-edited fixture data. For a new migration, use
`uv run alembic revision -m "describe the change"`, add explicit portable SQL or
Alembic operations, then run `uv run alembic upgrade head` against a copy of the
target database first.

Do not expose `DATABASE_URL` to the browser or commit it. The FastAPI service is
the only component that should hold database credentials.

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

With Supabase configured, startup/migrations create the empty PostgreSQL schema.
An explicit `sqlite:///...` URL is supported
only for local testing; there is no SQLite default. Both stores are editable through `/api/v1/admin/*`
or the admin UI. Manually entered test records are simulated and are not live
government, outbreak, weather, supplier, or regulatory data.

## Nearby agrovet directory

After a disease result includes possible matches, the UI can request
`GET /api/v1/disease/nearby-agrovets` with the resolved `county`, `area`, and one or
more `disease_id` values from that result. It reads the editable `agrovets` table and
returns area-matched directory entries with a treatment/service label, indicative cost,
and phone number. The records are simulated: they do not confirm business details,
distance, stock, current price, product approval, or treatment suitability.

The frontend reads the server-only `BACKEND_URL` from `frontend/.env.local` and
proxies browser `/api/v1/*` requests to it. Configure `FRONTEND_URL` in the
backend environment with the allowed browser origin. Set these in the respective
deployment environments; the backend deliberately has no URL fallback.

The independent planting API remains available. Missing location, season, or
crop evidence produces a clarification rather than fabricated advice.

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

Schema-only startup creates empty counties, areas, varieties, suitability,
management, supplier, and climate tables. Existing manually entered records
remain editable. No planting records are inserted in hosted deployments. The
private `data/planting_tables.sql` loader is available only with an explicit
local `LOAD_DEMO_SEED=true` and a complete local fixture set. Fixture-dependent
legacy tests explicitly opt in and skip when those ignored files are absent.
The disease-only manual guide is the default fresh-checkout test path.

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

The `suppliers` table includes editable `contact_phone` and `contact_email`
fields. Seeded supplier contacts are deliberately invalid test placeholders
(the numbers use `000`, and email addresses use `example.invalid`); they are not
real business contacts. The planting result shows contacts, verification flags and
matching variety listing details with their limitations.

## Accounts and saved planting plans

On `/planting`, choose a location and season, find crops, open a planting plan
and select **Save this plan**. Register or log in when prompted. Open **My plans**
to revisit the saved plan and add categorized notes with an optional observation
date. Thika, Kiambu, long rains has seeded sample plans. Crop-health remains
independently available at `/disease`; written tomato symptoms such as “brown
spots and concentric rings” can use its local fallback without an OpenAI key.
Planting recommendations require `OPENAI_API_KEY` as described above.

Accounts, salted password hashes, opaque session hashes, plan snapshots and notes
are stored in the configured PostgreSQL or explicit local SQLite database. Precise GPS coordinates are not saved in
plan snapshots. Sessions use HttpOnly, SameSite cookies and expire after seven
days; use the same hostname (for example `localhost`) for frontend and backend so
the browser can send the cookie. This is a local demo: email verification, password
recovery, rate limiting and production deployment hardening are not implemented.
The admin interface requires an administrator account. Restart the backend to
create empty tables; no test records are imported. Model trace export and
response storage remain disabled.

### Editing detailed planting plans

In `/planting/admin`, `management_plans` holds area/season/variety rain needs,
weeding count and fertility notes. Edit each activity and its relative day range
in `management_stages`; negative days are before planting. Add or change input
names and units in `inputs` and per-acre quantities in `stage_inputs`. Treatment
records can be edited in `stage_treatments`; only sourced non-chemical actions
are displayed, and pesticide instructions are excluded. Review the weeding count
and stage entries together when editing: they are independent fields. The weather
comparison comes from the area/season `weather_forecasts` scenario, not live
weather. Sample timings and seed, compost and fertilizer quantities are
fictional interface data, not usable application rates. Do not apply them.
Saved plans are snapshots; save a plan again to capture changed source data or
weather. Existing saved snapshots and notes remain unchanged.


## Duducare additions

`POST /api/v1/chat` uses typed, bounded scripted guidance from
`data/chat_guidance.json`; no third-party chat integration is implied.
`POST /api/v1/planting/demo-recommend` runs existing local rules without an API
key. Agent ranking remains on `/api/v1/planting/recommend`. Both location/season
option endpoints are reachable. `/api/v1/saved-plans` exposes the existing
ownership-checked snapshot and note services and uses no-store responses.
See the root README for isolated SQLite setup and sample inputs for both modules.
