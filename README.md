# Shamba Guide agricultural advisory demo

This repository contains a farmer-facing Next.js app and a FastAPI service for
an integrated agricultural advisory demonstration. The current implementation
completes the disease identification phase. Planting advice remains a separate
planned module and is visibly marked as the next phase.

All agricultural evidence is simulated, dated, geographically scoped, and
editable in normalized SQLite tables. The demo does not connect to live weather,
outbreak, pesticide, government, or supplier services.

## Run the backend

```bash
cd backend
cp .env.example .env
# Put OPENROUTER_API_KEY or OPENAI_API_KEY in .env
uv sync
uv run uvicorn app.main:app --reload
```

OpenRouter takes precedence when both provider keys are present. If neither key
is set, written symptom matching still works with lower confidence; photo
interpretation requires one of the configured AI providers.

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

The SQLite file is created at `data/advisory.db` on first backend start. Edit
`data/seed.sql` to change fresh-install sample data. Existing databases keep
admin edits across restarts.
