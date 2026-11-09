# Shamba Guide agricultural advisory demo

This repository contains a farmer-facing Next.js app and a FastAPI service for
a crop-health identification demonstration. The planting module is currently
retired from the application surface.

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

Set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` to the FastAPI origin
(for example, `http://localhost:8000`). Set `FRONTEND_URL` in `backend/.env`
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
