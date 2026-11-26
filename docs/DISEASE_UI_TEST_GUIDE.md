# Disease UI test guide

Test crop disease identification using records entered manually through the
administrator UI. All entries below are fictional interface test data. They
do not establish a diagnosis, current outbreak, treatment approval, supplier
stock, price, or stakeholder endorsement. Do not mark them verified.

No SQL seed upload is required. A new database starts with empty tables.
This guide covers the disease module only.

## Prepare the test deployment

1. Deploy the updated backend with `LOAD_DEMO_SEED=false` (the default).
   Production requires the backend-only Supabase settings documented in
   [backend setup](../backend/README.md). Existing database records are preserved;
   the change does not clear previously imported data.
2. In the frontend Vercel project set
   `BACKEND_URL=https://dudu-app-nine.vercel.app`, without `/api/v1`, and redeploy.
   Set the backend's `FRONTEND_URL=https://dudu-app-f.vercel.app`.
3. Open `https://dudu-app-nine.vercel.app/api/v1/health`: expect HTTP 200 and JSON
   with `status: ok`. Open `https://dudu-app-f.vercel.app/api/v1/auth/me` while
   signed out: expect HTTP 401 with JSON, rather than an HTML or Vercel error.
4. For the repeatable written-symptom checks below, use a dedicated test
   deployment without `OPENAI_API_KEY`. The app uses its visibly labeled local
   matcher; images are not interpreted. The optional AI check is separate below.

For local testing, choose an explicit SQLite URL, set `FRONTEND_URL` to your
local frontend origin, and set frontend `BACKEND_URL=http://localhost:8000`.
Keep `LOAD_DEMO_SEED=false`. All remaining record-entry steps are the same.

## Create the first administrator

A developer must create the first administrator against the intended test
database. Public registration creates ordinary farmer accounts, never admins.
From `backend/`, with that database's environment settings loaded:

```bash
uv run alembic upgrade head
uv run python scripts/create_admin.py
```

Choose a test administrator name, email, and password when prompted. These
commands create the schema and administrator account only; they do not insert
agricultural records. Keep the credentials private.

Log in at `/account/login`, then open `/disease/admin/sources`. The account menu
also links administrators to **Information databases**. An ordinary farmer
must not be able to read or edit these databases.

## Enter the required records

Use the database navigation to follow this order. Expand **Add ...**, fill the
fields, and save each record. In reference dropdowns select the named record
created earlier. Do not assume a numeric record ID.

If these exact records already exist, inspect or edit them instead of adding
duplicates. Keep county, area, crop, and season spelling consistent.

### Source

Open `/disease/admin/sources` and add:

| Field | Value |
| --- | --- |
| Source name | Duducare manual disease test |
| Date or period | 2026-11-22 |
| Geographic coverage | Kiambu / Thika test area |
| Evidence status | Simulated |
| Limitations | Fictional UI test data. No diagnosis, current outbreak, stock, price or endorsement is established. |

Use this source for the remaining reference dropdowns.

### Location

Open `/disease/admin/locations` and add:

| Field | Value |
| --- | --- |
| County | Kiambu |
| Area | Thika |
| Latitude | -1.0333 |
| Longitude | 37.0693 |
| Agro-ecological context | Manually chosen test coordinates; not verified GPS. |
| Evidence status | Manually supplied |

These are administrator-entered test coordinates. Do not represent them as
consented or verified farmer GPS.

### Season

Open `/disease/admin/seasons` and add:

| Field | Value |
| --- | --- |
| County | Kiambu |
| Season | Long rains |
| Period | March–June (test period) |
| Start month | 3 |
| End month | 6 |
| Evidence basis | Explicit test selection; not a current rainfall advisory. |
| Source | Duducare manual disease test |

This is a selected test period for the test area, not a national planting
calendar or a statement about current rain.

### Possible disease

Open `/disease/admin/diseases` and add:

| Field | Value |
| --- | --- |
| Crop | Tomato |
| Common name | Tomato leaf-spot test record |
| Scientific name | Leave blank |
| Summary | Fictional possible-match record for testing symptom lookup only. |
| Source | Duducare manual disease test |
| Evidence status | Simulated |

### Symptoms

Open `/disease/admin/disease_symptoms`. Add these as two separate records:

| Possible disease | Plant part | Symptom | Match weight |
| --- | --- | --- | --- |
| Tomato leaf-spot test record | leaf | brown spots | 1.0 |
| Tomato leaf-spot test record | leaf | concentric rings | 1.5 |

Weights exercise the interface's wording matcher. They are not validated
diagnostic probabilities.

## Add optional disease context

### General action

Open `/disease/admin/treatments` and add:

| Field | Value |
| --- | --- |
| Possible disease | Tomato leaf-spot test record |
| Crop | Tomato |
| Geographic coverage | Kiambu |
| Recommended action | Record the spread and ask an extension officer to confirm the cause before selecting any product. |
| Action type | general monitoring |
| Requires verified diagnosis | Unchecked |
| Source | Duducare manual disease test |
| Evidence status | Simulated |

Do not enter pesticide names, rates, mixtures, or approval claims for this test.

### Historical context

Open `/disease/admin/outbreaks` and add:

| Field | Value |
| --- | --- |
| Possible disease | Tomato leaf-spot test record |
| County / Area | Kiambu / Thika, in the separate fields |
| Observed period | April 2024 (fictional) |
| Report summary | Historical fictional UI example; not a current outbreak. |
| Source | Duducare manual disease test |
| Evidence status | Simulated |
| Coordinate status | manually_supplied |
| Latitude / Longitude | Leave both blank |
| AI-assisted observation | Unchecked |

### Fictional directory entry

Open `/disease/admin/agrovets` and add:

| Field | Value |
| --- | --- |
| Possible disease | Tomato leaf-spot test record |
| Business name | Fictional Thika test directory |
| County / Area | Kiambu / Thika, in the separate fields |
| Address | Fictional test address; do not travel here. |
| Phone number | Not a working contact |
| Service or treatment name | Extension referral discussion (test) |
| Indicative cost (KES) | Unknown; test listing only |
| Source | Duducare manual disease test |
| Evidence status | Simulated |

This entry tests the listing UI only. It is not a real supplier recommendation.

### Add more drugs to the existing agrovet

Register a test account, then edit **Fictional Thika test directory** at
`/disease/admin/agrovets` and select that account under **Owner account**. Open
`/agrovets/mine` while signed in as that owner. Add **Fictional product A** and select
**Tomato leaf-spot test record** from the disease dropdown. Add another fictional
disease in `/disease/admin/diseases`, then add **Fictional product B** for it under
the same agrovet. The shop remains one business row with two separate listings.
An admin can also use **Add drug** on that agrovet's row in
`/disease/admin/agrovets`; the drug form opens with the business preselected.
Owners can mark a listing unavailable or remove it. Admins can also add or edit
records in `/disease/admin/agrovet_drugs`. These are self-reported records awaiting
validation; they do not confirm registration, treatment suitability or stock.
After an expert approves a disease on a saved case, the case's **Nearby Agrovets**
section shows county, area and the locked reviewed disease used to filter listings.
For an approved case, matching listings for the saved area load automatically. Each
card shows the recorded phone, address, drug or service, indicative cost and source
limitations; the fictional contact details must remain visibly unverified.

## Check the farmer flow

Open `/disease` or refresh it after adding the records. A farmer does not need
an account to request an advisory. Select **Tomato** and **leaf**, describe
`brown spots with concentric rings`, and select **Kiambu**, **Thika**, and
**Long rains**. Leave the photo empty and **Save for expert review** unchecked.

| Check | Expected result |
| --- | --- |
| Submit the values above | Possible match named Tomato leaf-spot test record, with matched observations, uncertainty, source/date, and disclaimer. No definitive diagnosis. |
| Inspect local context | Thika, Kiambu and Long rains with the entered test period are visible. Correct them by reopening the form. |
| Inspect optional context | The general action appears; the April 2024 record is historical/simulated; the directory entry is fictional, with no verified stock or cost claim. |
| Replace symptoms with `xyzq` | Clarification/no supported match. The app must not invent a disease absent from the records. |
| Clear symptoms and leave photo empty | A focused validation prompt before submission. |
| Leave county/area or season unselected | A prompt to supply context; no precise location or season silently chosen. |
| Select another crop | No Tomato match is presented as a diagnosis for that crop. |
| Submit without storage consent | No new disease-case or pending AI-outbreak record is saved. |
| Upload a photo without symptoms, with no AI key configured | A clear statement that the photo was not analysed and a request for written symptoms. |

Browser location is optional. Declining it must leave manual county/area
selection usable. The entered administrator coordinates are never evidence
that the farmer granted browser-location consent.

## Check saving and review

1. Register a separate farmer at `/account/register`. Reload after registration,
   log out, and log in again; the account session should work without JSON
   parsing errors. The farmer still has no database-administrator access.
2. Submit the positive written-symptom case with **Save for expert review**
   explicitly checked. Expect a saved/unverified recording message. Open
   `/disease/cases` as that farmer and inspect the saved observations and result.
3. In the administrator session open `/disease/admin/disease_cases`. The case
   appears with its original evidence. Try rejecting it with no review note:
   expect validation. Then reject it with
   `UI test only; no expert diagnosis was made.` and save.
4. Refresh the case and confirm the decision and comment persist. A different
   farmer must not be able to read this farmer's private case.
   For an approval, select a reviewed disease from the same crop and enter a review
   comment. The admin list shows it beside Status; the original AI match remains
   in the evidence. The farmer case shows the reviewed disease and a Nearby Agrovets
   link. Select the current county and area before searching the simulated directory.
5. Restart the backend and inspect the manual source, location, disease, and
   case. They must persist without new fixture rows or changed descriptions.

In the no-key test, the local matcher does not create an AI outbreak observation.
The optional historical row added above remains distinct from farmer case history.

## Optional AI photo check

On a dedicated test deployment with a working server-side OpenAI key, submit a
clear crop photo after reading the consent notice. Expect separate image,
search, and judge status records. A local candidate is possible only when the
observations support a record actually entered in the database; an unmatched
or unclear image should lead to clarification. Exact AI results may vary.

Saving a photo additionally requires explicit expert-review consent and a
private Supabase bucket. Verify that no-consent submissions create no stored
photo, an administrator can open a consented case photo, and a signed-out
visitor cannot. A storage or model failure must remain visible and must not
be presented as completed photo analysis or verified diagnosis.

## Automated check

From `backend/`:

```bash
uv run python -m unittest discover -s tests -p test_manual_disease.py -v
```

These tests start with an empty temporary database and a nonexistent seed
path, then exercise the same account, admin, and disease HTTP endpoints used
by the UI. Set `TEST_POSTGRES_DATABASE_URL` to a disposable PostgreSQL database
to also test that backend; those tests create and remove isolated schemas.
