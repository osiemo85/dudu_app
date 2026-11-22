# Local data and optional private fixtures

The default application creates empty tables from
`backend/app/data_access/schema.py`. No agricultural records are automatically
inserted. Use the [disease UI test guide](../docs/DISEASE_UI_TEST_GUIDE.md) to
enter fictional, dated test records manually.

These optional legacy fixture files are ignored by Git and must stay local:

- `seed.sql`
- `supabase_seed.sql`
- `planting_tables.sql`
- `management_enrichment.sql`
- `management_input_examples.sql`

Their local copies are retained when they are removed from Git tracking.
They are not required in fresh checkouts or hosted deployments. A developer
who already has the complete private fixture set can opt in locally with
`LOAD_DEMO_SEED=true`; production and Vercel reject that option.

`user_plans.sql` and `animal_cases.sql` contain table definitions, not seed
records. The JSON files contain scripted demo content for the separate chat
and animal modules. None establish current field conditions or verified advice.
Database files and consented local photos remain ignored as well.
