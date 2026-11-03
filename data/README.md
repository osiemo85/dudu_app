# Simulated demo data

All records in these files are editable, fictional fixtures for the demo. They
are not live weather, outbreak, regulatory, supplier, or agricultural advice
data.

| Tables | Seed file |
| --- | --- |
| `sources`, `locations`, `seasons`, `crops`, `planting_calendars`, `weather_forecasts`, `extension_advice`, `indigenous_knowledge`, `input_records` | `seed.sql` |
| `counties`, `areas`, `varieties`, `area_season_varieties`, `management_plans`, `management_stages`, `inputs`, `stage_inputs`, `suppliers`, `supplier_varieties`, `area_season_climate` | `planting_tables.sql` |
| Additional plan stages, test inputs, and `stage_treatments` | `management_enrichment.sql`, `management_input_examples.sql` |
| Local demo accounts, sessions, saved plans, and notes | `user_plans.sql` |

`area_season_climate` is populated for the seeded Thika, Njoro, Kerugoya, and
Kangundo area/season combinations. Its rainfall, temperature, and humidity
values are fictional scenarios with a simulated source record; they are not a
forecast or observed climate data.
