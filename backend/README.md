# FastAPI backend

Install and run with `uv` from this directory:

```bash
cp .env.example .env
# Add OPENROUTER_API_KEY or OPENAI_API_KEY to .env
uv sync
uv run uvicorn app.main:app --reload
```

OpenRouter is selected when `OPENROUTER_API_KEY` is present. Otherwise the
service uses `OPENAI_API_KEY`. With neither key, the disease endpoint remains
usable through its bounded symptom-table matcher and clearly reports that the
image was not interpreted by an AI provider.

The first API start creates `../data/advisory.db` from `../data/seed.sql`.
The SQLite database is persistent and editable through `/api/v1/admin/*` or the
admin UI. Seed records are simulated and are not live government, outbreak,
weather, supplier, or regulatory data.

The frontend checks `http://localhost:8000/api/v1/health` by default. Set
`FASTAPI_URL` for the server-rendered health check and
`NEXT_PUBLIC_FASTAPI_URL` for browser requests when using another API origin.
