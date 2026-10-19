# Agent Instructions

These instructions apply to coding agents and developers working on the Integrated Agricultural Advisory Demo. Read this file first, then read [STRUCTURE.md](STRUCTURE.md) and [SPECS.md](SPECS.md). Consult [DATA_MODEL.md](DATA_MODEL.md) and [KENYA_CONTEXT.md](KENYA_CONTEXT.md) when they are added; do not assume their future contents.

## Product scope

Build a simple, useful demo with two complementary but independently usable modules:

1. **Disease identification**: a crop photo and/or symptoms produce possible diagnoses, with relevant local treatment and outbreak context.
2. **Planting advice**: location, season, crop preference, and available local evidence produce practical guidance about what, when, and how to plant.

The project is a demo, not a substitute for a qualified agronomist, extension officer, laboratory diagnosis, pesticide label, or official advisory. Make uncertainty and the simulated nature of the data visible.

## Decision rules

- Resolve **location and season before giving location-dependent recommendations**. Show the location and season used in the result and allow correction.
- When a farmer uses the app, request browser location only with clear user consent. Explain why it is needed. If permission is declined or unavailable, allow manual selection of a county/area and, where useful, a manually entered coordinate.
- Provide a separate **demo/testing data-entry path** for contributors or administrators to add records with manually chosen coordinates. Clearly label those coordinates as test or manually supplied data; they must not be represented as a user's verified GPS location.
- Do not silently infer a precise location or a planting season. If the location, season, crop, symptoms, or image is insufficient to give useful advice, ask a focused clarification and explain why it matters. Offer a safe general response only when clearly labeled as general.
- Seasons and recommendations vary by agro-ecological zone, altitude, rainfall pattern, and local conditions. Never apply one national calendar as if it were universal.
- Prefer local, dated, attributable records. Show source name, date/period, geographic coverage, and whether the record is verified, simulated, or awaiting validation.

## Data and safety

- Use **simulated APIs and editable local tables only** for the demo. Do not imply that a live government, weather, outbreak, pesticide-registration, supplier, or other external API is connected unless it has actually been integrated and verified.
- Treat sample/historical records as examples for decision design, not current field conditions. Display their date and limitations. Do not fabricate citations, approvals, outbreak reports, stock availability, or stakeholder endorsement.
- Do not prescribe pesticide use from an unverified diagnosis. Give only label-consistent, locally authorized treatment information when supported by a trustworthy source; otherwise advise consulting an extension officer or qualified agro-dealer and following the product label. Never invent rates, mixtures, intervals, or safety instructions.
- Recommendations that depend on weather or current input availability must state whether that evidence is simulated, stale, or unavailable. Do not claim a nearby agro-vet has stock without current verified data.
- Collect the minimum necessary personal/location data. Do not retain precise user coordinates beyond the feature's stated need; avoid exposing them in logs or public responses.
- Preserve the distinction between farmer-provided observations, model-generated possibilities, simulated records, and expert-verified advice.

## Technical conventions

- Frontend: Next.js App Router, TypeScript strict mode, and Tailwind CSS.
- Backend: FastAPI with Pydantic request and response models.
- Put backend API routes under `/api/v1/`. Keep business decisions in services rather than route handlers.
- Prefer server components and route handlers where practical; use client components for browser geolocation, camera/upload, and interactive forms.
- Keep demo data editable under `data/` as JSON or SQLite. Keep schemas, provenance, and validation rules aligned with the data model.
- Every advisory response includes the resolved `location`, `season`, `sources`, and `disclaimer`; include `confidence` where applicable. If a value is unknown, represent it explicitly rather than fabricating one.
- Follow existing repository conventions and avoid unrelated changes. Keep UI language plain and usable on mobile.

## Collaboration and evidence

- Do not assume the stated app modules fully capture farmers' or stakeholders' problems. Treat user stories, workflows, and advice criteria as hypotheses to validate with farmers, extension officers, agro-vets, government bodies, agricultural organizations, and data custodians.
- Record provenance and unresolved questions. Seek stakeholder review before presenting simulated advice as operational or authoritative.
- Identify candidate information sources and custodians before making claims about availability. Distinguish a potential source from a confirmed accessible API/database, and record access, licensing, update cadence, and geographic coverage when known.
- When requirements conflict or a choice materially changes safety or recommendations, ask a concise clarification rather than silently guessing. For routine reversible implementation choices, use the safest reasonable default and document it.
