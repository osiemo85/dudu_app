# Shamba Guide agricultural advisory demo

This repository contains a farmer-facing Next.js app and a FastAPI service for
an integrated agricultural advisory demonstration. Both disease identification
and planting advice are implemented as independently usable modules.

All agricultural evidence is simulated, dated, geographically scoped, and
editable in normalized SQLite tables. The demo does not connect to live weather,
outbreak, pesticide, government, or supplier services.

## Run the backend

```bash
cd backend
cp .env.example .env
# Put OPENAI_API_KEY in .env
uv sync
uv run uvicorn app.main:app --reload
```

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

Open `http://localhost:3000`. The defaults expect FastAPI at
`http://localhost:8000`. For another origin, set both `FASTAPI_URL` and
`NEXT_PUBLIC_FASTAPI_URL` in the frontend environment.

## Demonstrate disease identification

1. Open **Check crop health**.
2. Select `Tomato`, describe `brown spots with concentric rings on lower leaves`,
   select `Kiambu / Thika`, and choose `Long rains`.
3. Submit to see ranked possible causes, matched evidence, confidence, dated
   simulated area history, bounded actions, source limitations, and the resolved
   location and season.
4. Try an empty observation to see a focused clarification response.
5. Open **Admin** to add or edit a simulated source, location, season, disease,
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

The SQLite file is created at `data/advisory.db` on first backend start. Edit
`data/seed.sql` to change fresh-install sample data. Existing databases keep
admin edits across restarts. Consented review photos are stored locally under
`data/outbreak_evidence/` and are git-ignored.

## Demonstrate planting advice

1. Open **Plan a crop**.
2. Select `Machakos / Kangundo`, `Short rains`, no irrigation, good drainage,
   and a low risk preference. Leave crop preference open.
3. Submit to compare locally matched crop options. The result shows how the
   simulated dry scenario favors lower-water options, alongside planting windows,
   practical steps, risk checks, extension-style notes, input limitations,
   evidence gaps, review triggers, sources, and confidence.
4. Select `Kiambu / Thika`, `Long rains`, and `Potato` with poor drainage to see
   a constraint downgrade the option.
5. Omit location or season, or choose a crop without a matching local calendar,
   to see a focused clarification instead of fabricated advice.

Planting decisions use only editable local demo tables. Weather records are
scenarios, not forecasts; input records do not verify certification or stock;
local-knowledge placeholders await community review and permission. Soil tests,
farm budgets, live prices, buyers, labour, and field observations are explicitly
identified as gaps rather than inferred.

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
