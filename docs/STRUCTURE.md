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
