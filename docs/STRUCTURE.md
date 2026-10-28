# Project Structure and Naming

This document describes the intended demo layout. Some directories may not exist yet; create them as implementation proceeds. Keep files focused by feature and use clear, consistent snake_case names for Python modules/data and PascalCase for React components.

```text
├── docs/
│   ├── AGENTS.md                 # Primary instructions; read first
│   ├── STRUCTURE.md              # Layout and naming conventions
│   ├── SPECS.md                  # Functional specifications
│   ├── DATA_MODEL.md             # Planned table schemas, provenance, seed rules
│   └── KENYA_CONTEXT.md          # Planned regional/season decision context
│
├── backend/                      # FastAPI service (planned)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/
│   │   │   ├── disease.py
│   │   │   ├── planting.py
│   │   │   ├── location.py
│   │   │   ├── season.py
│   │   │   ├── admin.py          # Demo-table CRUD and manual test records
│   │   │   └── health.py
│   │   ├── models/               # Pydantic request/response schemas
│   │   ├── services/             # Decision logic
│   │   │   ├── disease_engine.py
│   │   │   ├── planting_engine.py
│   │   │   └── context.py        # Location and season resolution
│   │   ├── data_access/          # Read/write JSON or SQLite tables
│   │   └── core/
│   │       ├── config.py
│   │       └── disclaimers.py
│   ├── requirements.txt
│   └── README.md
│
├── frontend/                     # Existing Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing/module selector
│   │   ├── disease/page.tsx
│   │   ├── planting/page.tsx
│   │   ├── admin/page.tsx        # Demo data entry/editing
│   │   └── api/                  # Optional proxy handlers
│   ├── components/
│   │   ├── LocationSeasonPicker.tsx
│   │   ├── DiseaseUpload.tsx
│   │   ├── PlantingForm.tsx
│   │   ├── AdviceCard.tsx
│   │   ├── ClarificationPrompt.tsx
│   │   └── DisclaimerBanner.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   ├── public/
│   └── package.json
│
├── data/                         # Editable simulated data; source of demo records
│   ├── counties.json
│   ├── seasons.json
│   ├── crops.json
│   ├── diseases.json
│   ├── disease_treatments.json
│   ├── outbreaks.json
│   ├── planting_calendars.json
│   ├── certified_inputs.json
│   ├── weather_simulated.json
│   ├── extension_advice.json
│   ├── indigenous_knowledge.json
│   └── agro_ecological_zones.json
│
└── README.md                     # Demo setup and run instructions
```

## Data flow

1. The user grants browser location or chooses a location manually. Data contributors can enter manually chosen coordinates through the clearly labeled demo/admin path.
2. The app resolves the location to the available county/area and agro-ecological context. It asks the user to correct ambiguous or missing context.
3. The app determines candidate season context from dated local calendar records and user input; it asks for clarification when the records conflict or do not cover the area.
4. A module gathers relevant user observations and matching simulated records, then returns structured advice with provenance, dates, confidence/uncertainty, and a disclaimer.
5. All advice should make its evidence status clear: simulated, user-entered, pending validation, or verified source record.

## Naming and API conventions

- Python files and data fields use `snake_case`; React components use `PascalCase`; routes use lowercase feature names.
- Backend routes use `/api/v1/` and return typed Pydantic models.
- Use stable IDs for data records. Include `source`, `source_date` or period, `geographic_scope`, and `evidence_status` where relevant.
- Avoid encoding changing business rules in UI text or route handlers; place them in services and editable data.
- Keep actual user location separate from manually entered coordinates for test/demo records.

## Implemented disease agent workflow

- `backend/app/services/disease_agent.py`: a photo-symptom agent, local evidence search
  agent, and final-judge agent. The photo agent returns a short description and visible
  symptoms; the search agent can query only exact farmer or photo observations; the judge
  reviews image analysis and retrieved records before selecting possible matches. Each
  role has a structured output and distinct local run metadata. An optional officer
  report agent runs only with farmer consent.
- `backend/app/services/disease_engine.py`: resolved context, validated advisory assembly,
  visible fallback behavior, then consent-gated persistence.
- `backend/app/services/outbreak_recorder.py`: consent-gated photo lifecycle and compact
  outbreak review records: analysis timestamp, image description, farmer symptoms,
  local image path, and an expert decision/comment.
- `backend/app/data_access/disease_repository.py`: atomic case and pending observation writes.
- `data/seed.sql`: additive `disease_cases` schema; existing SQLite records remain intact.
- Crop-health admin `disease_cases`: full evidence, photos, agent identities/runs and review
  fields. Other modules remain independently reachable and usable.

## Planting agent workflow

- `backend/app/services/planting_agent.py` runs the planting agent and validates
  its two read-only crop and forecast tool calls before presenting results.
- `data/planting_tables.sql` contains editable simulated area candidates and
  seasonal forecast fixtures. Startup migrates the old `weather_samples` table
  to `weather_forecasts` and extends `crops` with rain-duration requirements.

`backend/app/services/planting_details.py` assembles area/season/crop plans and
supplier listings from local records for `/api/v1/planting/crops/{id}/details`;
`frontend/components/CropDetails.tsx` displays them from planting result cards.
