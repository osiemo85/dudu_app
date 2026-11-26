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

FastAPI requires an explicit database URL. Startup creates empty tables and
applies additive schema upgrades from bundled Python code; it does not read or
insert agricultural seed data. PostgreSQL uses `DATABASE_URL` in development.
See the [disease UI test guide](docs/DISEASE_UI_TEST_GUIDE.md) for sample records
to add manually through the administrator interface.

SQLite is available only through an explicit `sqlite:///...`
URL for local testing; it is never selected by default. Keep this secret
server-side; never add it to frontend environment files.

Run `uv run alembic upgrade head` for tracked structural changes. The schema-only
bootstrap also runs at startup. Optional local fixture SQL files stay ignored
in `data/`; they are not required in a fresh checkout or hosted function.

For production, set these **backend-only** environment variables:

```dotenv
ENV=prod
SUPABASE_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?sslmode=require
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=disease-photos
```

`SUPABASE_DATABASE_URL` replaces `DATABASE_URL` only in production, including for
Alembic. `SUPABASE_URL` is the HTTPS project URL, not the database connection
string. Missing production settings stop startup instead of selecting a local
database or filesystem. Keep `FRONTEND_URL` set to your deployed frontend origin.

Create `disease-photos` in Supabase **Storage** with **Public disabled**, a 10 MB
file limit, and JPEG/PNG/WebP allowed types. Get the project URL from **Connect**
and the backend secret from **Settings → API Keys**. Run
`uv run alembic upgrade head` before starting the API. Leave
`LOAD_DEMO_SEED=false` (the default). The bucket is checked for
privacy before uploads and downloads. Only consented crop-review photos are
uploaded; database records store a `supabase://bucket/path` reference. Admin photo
endpoints check the existing account role and proxy private bytes with `no-store`.
Upload or database failures preserve the advisory result and report a failed save;
failed database writes trigger best-effort photo deletion. A cleanup warning
requires manual reconciliation. Existing local photos are not migrated automatically.
Animal photos remain device-only previews. See [backend setup](backend/README.md).

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

For Vercel, set `BACKEND_URL` in the frontend project's environment variables
to the separately deployed FastAPI service's **public HTTPS origin**, without
`/api/v1`, and redeploy so the rewrite is rebuilt. Localhost works only for
local development. Set the backend's `FRONTEND_URL` to the hosted frontend's
exact origin. See [frontend deployment checks](frontend/README.md#deploy-on-vercel)
for troubleshooting HTML API 404s and `DNS_HOSTNAME_RESOLVED_PRIVATE` errors.

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

Add test records manually using the [disease UI test guide](docs/DISEASE_UI_TEST_GUIDE.md).
Existing databases keep admin edits across restarts. In development, consented review photos are stored
under `data/outbreak_evidence/` and are git-ignored. Production uses the private
Supabase Storage bucket described above.

## Accounts and information databases

Normal users may register and log in from the app. Administrators can only log
in; create the first administrator from the backend after the database schema is
available:

```bash
cd backend
uv run python scripts/create_admin.py
```

The script prompts for name, email, password, and password confirmation. Only an
authenticated administrator can see or use **Information databases**. Disease
and planting remain independently accessible; empty evidence produces explicit
clarification. The manual test guide covers disease only.

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

The admin interface requires administrator authentication. Consented case data
and photos require an appropriate retention policy. Case snapshots cannot be edited through
the table editor; review fields remain editable. Existing records survive the additive
schema update on backend restart.


## Duducare local demo (no external services required)

A fresh database is empty. Use the [disease UI test guide](docs/DISEASE_UI_TEST_GUIDE.md)
to add disease records manually. The older sample walkthroughs below assume
matching records already exist; planting returns clarification until its own
location, season, and crop evidence is supplied. Private local fixtures are
optional and are not distributed with the repository.

Use an explicit local SQLite URL to keep testing separate from any configured database:

```bash
cd backend
uv sync
DATABASE_URL=sqlite:////tmp/duducare-demo.db LOAD_DEMO_SEED=false OPENAI_API_KEY='' FRONTEND_URL=http://localhost:3000 uv run uvicorn app.main:app --reload
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

1. **Crop health**: Tomato; affected part `leaf`; `brown spots with concentric rings on lower leaves`;
   Kiambu / Thika; Long rains. Submit for possible matches, local evidence and
   limitations. Do not opt into storage unless wanted.
2. **Planting**: Machakos / Kangundo; Short rains; no preferred crop;
   rainfed irrigation. Submit for simulated crop options. Try Kiambu / Thika /
   Long rains / Maize to view a growing plan. The plan includes sourced stages;
   sign in to save an account-owned snapshot, then add observations under
   My farm → Saved planting plans.
3. **Farm chat**: log in, choose an expert from the database-backed directory,
   and send a private message. Log in as that expert in another browser/profile
   to see the unread badge and reply. Conversations survive reload and logout.
   Existing administrator accounts serve as expert-review accounts in this demo;
   their credentials and response times are not verified. See the messaging setup
   below. The separate `/chat/assistant` still provides editable scripted replies
   from `data/chat_guidance.json`; it keeps no saved history or access to expert chats.
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
and Log out. Profile opens `/profile` to edit your name and optional, manually
entered county/area; email and role are read-only. Chat participants can see the
name and optional location, and expert locations appear in the expert picker.
Settings opens `/settings`. English/Kiswahili is available there and in the header, including
before login. The preference remains on this browser after logout.
Legacy evidence records and saved results keep their original wording; the
Swahili interface discloses this rather than silently translating source material.

For existing PostgreSQL databases, run `uv run alembic upgrade head` from backend
before saving animal cases. Schema-only startup creates the same empty tables
on either backend. Restart FastAPI after updating.

## Agrovet drug listings

Run `uv run alembic upgrade head` from `backend` and restart FastAPI. In
`/disease/admin/agrovets`, edit an existing agrovet and assign its registered
**Owner account**. Owners then open **My agrovet drugs** from the account menu
or `/agrovets/mine`, enter a drug name, and select a disease from the existing
Diseases table. The same agrovet can have several drug and disease listings;
owners can mark a listing unavailable or remove it. Admins can manage the same
records at `/disease/admin/agrovet_drugs`. A second business record with the
same name, county and area is rejected during creation.
On the admin **Agrovets** table, use **Add drug** on the existing business row;
its business name is preselected in the drug form. On an approved disease case,
**Nearby Agrovets** shows county, area and a locked reviewed-disease filter.
County and area choices include locations with listings for that disease.

Listings and availability are self-reported and awaiting validation. They do
not establish a shop's certification, product authorization, treatment
suitability or verified stock. See `docs/DISEASE_UI_TEST_GUIDE.md` for a
fictional end-to-end example.

## Expert messages and profile location

Run `uv run alembic upgrade head` from `backend` and restart FastAPI after
updating. Revision `20261122_02` adds optional profile fields, private
conversations and message tables without seed accounts or messages. The same
additive schema upgrade runs during startup on SQLite and PostgreSQL, including
the configured Supabase database in production. Existing data is retained.

Create an expert account using `uv run python scripts/create_admin.py` if one is
not already present. Admin accounts are the existing expert-review login. In
`/profile`, an expert can optionally add county/area to make the directory easier
to browse. These are self-reported locations, not verified coverage or GPS.

For a complete demonstration, use two independent browser profiles:

1. Sign in as a farmer, open **Farm chat → Choose an expert**, and select the
   intended expert by name/area. Send a question.
2. Sign in as that expert in the second browser. The chat icon shows the number
   of unread incoming messages. Open the conversation and reply.
3. Return to the farmer's browser. The reply appears as unread until that
   conversation is open, the tab is focused, and the reader reaches the bottom.
   Reload or log out/in to verify saved history. **Load earlier messages** opens
   previous pages of a long conversation.

The inbox/thread poll every five seconds; the navigation badge polls every
15 seconds while visible and refreshes on focus. They are not browser push
notifications. Each conversation is accessible only to its two participants;
unrelated admins cannot inspect it. Messages are plain text, capped at 4,000
characters, and retry identifiers prevent duplicates after a lost response.
Connection failures retain the draft in the current thread; messages are never
queued offline. No chat content is cached by the service worker or sent to AI.
Opening the scripted assistant does not mark expert messages read.

Focused backend checks:

```bash
uv run python -m unittest discover -s tests -p 'test_messaging.py'
```

Set `TEST_POSTGRES_DATABASE_URL` to a disposable PostgreSQL
database to also run the isolated-schema PostgreSQL cases. Tests create their
own accounts and messages, never fixture users in the configured application DB.

Focused verification from backend:

```bash
uv run python -m unittest discover -s tests -p test_animal_health.py -v
uv run python -m unittest discover -s tests -p test_duducare.py -v
```

Veterinary review remains an open requirement. The general emphasis on reporting
unusual animal-health incidents follows [WOAH surveillance guidance](https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/current/en_chapitre_surveillance_general.htm);
that source does not validate Duducare's sample symptom matches or warning rules.
