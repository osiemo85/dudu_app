-- Fictional quantities for exercising the UI; never use as application rates.
INSERT OR IGNORE INTO inputs(name,unit,category) VALUES
 ('Test seed placeholder','kg','Seed'), ('Test compost placeholder','kg','Organic matter');
INSERT OR IGNORE INTO stage_inputs(management_stage_id,input_id,quantity_per_acre,notes)
SELECT ms.id,i.id,4,'Fictional test number only; obtain locally reviewed seed quantity.'
FROM management_stages ms JOIN management_plans p ON p.id=ms.management_plan_id JOIN inputs i ON i.name='Test seed placeholder'
WHERE ms.stage_name='Planting' AND p.rain_requirement_notes='Fictional test duration only; rain distribution and intensity are unknown.';
INSERT OR IGNORE INTO stage_inputs(management_stage_id,input_id,quantity_per_acre,notes)
SELECT ms.id,i.id,25,'Fictional test number only; obtain a locally reviewed fertility plan.'
FROM management_stages ms JOIN management_plans p ON p.id=ms.management_plan_id JOIN inputs i ON i.name='Test compost placeholder'
WHERE ms.stage_name='Land preparation' AND p.rain_requirement_notes='Fictional test duration only; rain distribution and intensity are unknown.';
