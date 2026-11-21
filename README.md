# Duducare agricultural advisory demo

This repository contains a farmer-facing Next.js app and a FastAPI service for
independent crop-health and planting-advice demonstrations, with farm chat,
a device-local notebook, saved growing plans, and installable PWA support.

All agricultural evidence is simulated, dated, geographically scoped, and
editable in normalized SQLite tables. The demo does not connect to live weather,
outbreak, pesticide, government, or supplier services.

## Run the backend

```bash
cd backend
cp .env.example .env
# Put OPENAI_API_KEY in .env
# Put the Supabase PostgreSQL connection string in DATABASE_URL.
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

FastAPI requires `DATABASE_URL` and uses Supabase PostgreSQL when given its
PostgreSQL URL. Generate the manual seed, then paste it into Supabase SQL Editor:

```bash
cd backend
uv run python scripts/export_supabase_seed.py > ../data/supabase_seed.sql
```

SQLite is available only through an explicit `sqlite:///...`
URL for local testing; it is never selected by default. Keep this secret
server-side; never add it to frontend environment files.

After creating the schema/fixtures for any database, run `uv run alembic upgrade
head`. Structural changes are tracked under `backend/alembic/versions`; simulated
fixture data remains in `data/` and is not managed by Alembic.

The OpenAI Agents SDK uses `OPENAI_API_KEY` and `OPENAI_MODEL` through the Responses API. OpenRouter and the manual chat-completions loop are no longer used. Without an OpenAI key, written symptom matching remains available; photos require OpenAI.
Results show whether AI analysis completed and whether the photo was analyzed.
If the provider rejects the key, update `backend/.env` and restart FastAPI;
shell environment variables override values in that file. Photo-only requests
ask for written symptoms when AI is unavailable instead of guessing a disease.

## Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Set `BACKEND_URL` in `frontend/.env.local` to the FastAPI origin (for example,
`http://localhost:8000`). Next.js keeps this server-only and proxies browser
requests from `/api/v1/*`. Set `FRONTEND_URL` in `backend/.env`
to the exact frontend origin (for example, `http://localhost:3000`). Restart
both servers after changing either value.

## Demonstrate disease identification

1. Open **Check crop health**.
2. Select `Tomato`, describe `brown spots with concentric rings on lower leaves`,
   select `Kiambu / Thika`, and choose `Long rains`.
3. Submit to see ranked possible causes, matched evidence, confidence, dated
   simulated area history, bounded actions, source limitations, and the resolved
   location and season.
4. Try an empty observation to see a focused clarification response.
5. An administrator can open **Information databases** to add or edit a simulated source, location, season, disease,
   symptom, treatment, or outbreak record. Admin-entered coordinates are labeled
   as manually supplied demo data.
6. To save an LLM possible match for expert review, select **Save for expert
   review** before submitting. The app stores the supplied details, optional
   coordinates, photo, validated result, and source evidence in a pending **disease cases** record.
   Open **Crop health → Admin → disease cases** to inspect full JSON evidence and the photo,
   then edit `expert_approval` and `expert_review_note`. Completed AI matches also create
   a linked pending outbreak observation, excluded from area history until reviewed.
7. Each submission has a unique workflow ID. Photo submissions record separate photo
   analysis, local database search, and final-judge agent runs; the officer-report agent
   runs only with review consent. Each run has a stable role ID, unique run ID, model,
   timestamp, and completion/failure status.
   Clarifications and AI failures can also be saved; they never create outbreak matches.
   A report or storage failure is visible without discarding a completed identification.

Edit `data/seed.sql` to change fresh-install sample data. Existing databases keep
admin edits across restarts. Consented review photos are stored locally under
`data/outbreak_evidence/` and are git-ignored.

## Accounts and information databases

Normal users may register and log in from the app. Administrators can only log
in; create the first administrator from the backend after the database schema is
available:

```bash
cd backend
uv run python scripts/create_admin.py
```

The script prompts for name, email, password, and password confirmation. Only an
authenticated administrator can see or use **Information databases**. Existing
planting tables are intentionally retained in the database for data preservation,
but no planting route, page, navigation, or API is exposed.

## Checks

```bash
cd backend
uv run python -m unittest discover -s tests

cd ../frontend
npm run lint
npm run build
```

## Agents SDK and local history

The implementation follows the [OpenAI Agents SDK quickstart](https://developers.openai.com/api/docs/guides/agents/quickstart).
`Agent`, `Runner.run`, typed `function_tool` lookups, and Pydantic structured outputs
replace the manual chat loop. Model tools have no write access; the service validates
candidate IDs and evidence lookups before persisting a case and its optional outbreak
observation in one database transaction. The officer-report agent summarizes evidence
gaps and follow-up questions; it cannot approve a case.

Photos and observations are sent to OpenAI when configured. Precise coordinates are
excluded from model input and retained locally only with review consent. SDK trace
export is disabled and Responses requests use `store=false`; local audit IDs are not
OpenAI dashboard trace IDs. Raw model exchanges and provider error bodies are not
logged. Provider processing remains subject to the account's data policies.

The existing admin interface has no authentication and is for local demo use only.
It now contains consented case data and photos; deployment with real farmer records
requires access control and a retention policy. Case snapshots cannot be edited through
the table editor; review fields remain editable. Existing records survive the additive
schema update on backend restart.


## Duducare local demo (no external services required)

Use an explicit local SQLite URL to keep testing separate from any configured database:

```bash
cd backend
uv sync
DATABASE_URL=sqlite:////tmp/duducare-demo.db OPENAI_API_KEY='' FRONTEND_URL=http://localhost:3000 uv run uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
BACKEND_URL=http://localhost:8000 npm run dev
```

Both modules are available without an account. Written disease observations use
local matching when OpenAI is unconfigured; a photo alone prompts clarification.
The planting screen deliberately uses `/api/v1/planting/demo-recommend`, a local
rules service; the separately available `/api/v1/planting/recommend` agent keeps
its explicit API-key requirement and validation behavior.

Demonstrate both flows:

1. **Crop health**: Tomato; `brown spots with concentric rings on lower leaves`;
   Kiambu / Thika; Long rains. Submit for possible matches, local evidence and
   limitations. Do not opt into storage unless wanted.
2. **Planting**: Machakos / Kangundo; Short rains; no preferred crop;
   rainfed irrigation. Submit for simulated crop options. Try Kiambu / Thika /
   Long rains / Maize to view a growing plan. The plan includes sourced stages;
   sign in to save an account-owned snapshot, then add observations under
   My farm → Saved planting plans.
3. **Farm chat**: ask `What should I plant?` with no context for a clarification;
   choose context and resend. Ask about pesticide doses to see the safe boundary.
   Replies are editable scripts in `data/chat_guidance.json`, not live AI,
   community messaging, or a consultation. Each request uses current selections;
   chat is memory-only and earlier messages are not analysed.
4. **My farm**: save a plot observation, reload to confirm local persistence,
   search it, export JSON, and delete it. Notes stay in this browser. Account
   plans are stored separately with ownership-checked backend access.

For install/offline testing, build and serve a production frontend:

```bash
cd frontend
BACKEND_URL=http://localhost:8000 npm run build
npm run start
```

Use HTTPS or localhost. Supported browsers offer Install Duducare; Safari uses
Share → Add to Home Screen. The service worker registers only in production.
It caches only a public offline explanation and brand icons. Navigations fall
back to that explanation while offline. APIs, photos, account data and advice
are never cached. Notebook entries survive in localStorage, but reopening the
app offline does not load the full notebook UI. A running backend is required
for chat/advice/account features. Offline submissions are not queued.

Validation:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
# from backend/
uv run python -m unittest discover -s tests -p test_duducare.py -v
```

## Animal health and bilingual accounts

Open **Health → Animal health**. Select cattle, confirm the warning-sign check,
select coughing, and enter two days. Submit to see a simulated respiratory group
and veterinary next steps. Select a warning sign to see referral messaging before
matching, or submit incomplete observations for clarification. Cattle, goats,
sheep and chickens are supported. A photo is only a device preview: it is not
sent to the backend or diagnosed. Do not interpret these fixtures as validated
veterinary advice.

Register/sign in, then select the storage-consent checkbox and save the animal
case. Open Animal case history from the result or My farm.
Other accounts cannot access the saved observation. Saving does not contact a vet.

The circle avatar in the sidebar footer opens a compact account menu; phones
have the same avatar in the header. The menu shows your name, Profile, Settings
and Log out. Profile opens `/profile` to edit your name; email is read-only.
Settings opens `/settings`. English/Kiswahili is available there and in the header, including
before login. The preference remains on this browser after logout.
Legacy evidence records and saved results keep their original wording; the
Swahili interface discloses this rather than silently translating source material.

For existing PostgreSQL databases, run `uv run alembic upgrade head` from backend
before saving animal cases. New manual Supabase seed exports include animal_cases.
SQLite demos create this additive table on startup. Restart FastAPI after updating.

Focused verification from backend:

```bash
uv run python -m unittest discover -s tests -p test_animal_health.py -v
uv run python -m unittest discover -s tests -p test_duducare.py -v
```

Veterinary review remains an open requirement. The general emphasis on reporting
unusual animal-health incidents follows [WOAH surveillance guidance](https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/current/en_chapitre_surveillance_general.htm);
that source does not validate Duducare's sample symptom matches or warning rules.
