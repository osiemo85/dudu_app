# FastAPI backend

Install dependencies and run the API from this directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The frontend checks `http://localhost:8000/api/v1/health` by default. Set
`FASTAPI_URL` in the frontend environment to use another backend origin.
The health endpoint confirms connectivity only; it does not provide agricultural
advice or connect to live data sources.
