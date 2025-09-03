-- Test script for daily_meals table
-- Run this after creating the daily_meals table to verify it works

-- Test 1: Insert a single day meal
INSERT INTO daily_meals (user_id, date, main_meal, kids_meal) VALUES (
  (SELECT id FROM auth.users WHERE email = 'mdehart1@gmail.com' LIMIT 1),
  '2025-01-27',
  '{"id": "test-1", "title": "Test Main Meal", "type": "meal"}',
  '{"id": "test-kids-1", "title": "Test Kids Meal", "type": "meal"}'
) ON CONFLICT (user_id, date) DO UPDATE SET
  main_meal = EXCLUDED.main_meal,
  kids_meal = EXCLUDED.kids_meal,
  updated_at = NOW();

-- Test 2: Insert another day
INSERT INTO daily_meals (user_id, date, main_meal, kids_meal) VALUES (
  (SELECT id FROM auth.users WHERE email = 'mdehart1@gmail.com' LIMIT 1),
  '2025-01-28',
  '{"id": "test-2", "title": "Test Main Meal 2", "type": "meal"}',
  NULL
) ON CONFLICT (user_id, date) DO UPDATE SET
  main_meal = EXCLUDED.main_meal,
  kids_meal = EXCLUDED.kids_meal,
  updated_at = NOW();

-- Test 3: Query the data
SELECT 
  date,
  main_meal->>'title' as main_meal_title,
  kids_meal->>'title' as kids_meal_title
FROM daily_meals 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'mdehart1@gmail.com' LIMIT 1)
ORDER BY date;

-- Test 4: Test date range filtering (simulate what the app will do)
SELECT 
  date,
  main_meal->>'title' as main_meal_title,
  kids_meal->>'title' as kids_meal_title
FROM daily_meals 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'mdehart1@gmail.com' LIMIT 1)
  AND date >= '2025-01-27' 
  AND date < '2025-02-03'
ORDER BY date;
