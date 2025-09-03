-- Debug script to check the current state of meal data
-- Run this to see what's in both tables

-- Check if daily_meals table exists and has data
SELECT 
  'daily_meals' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM daily_meals;

-- Check if meal_plans table still has data
SELECT 
  'meal_plans' as table_name,
  COUNT(*) as record_count,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM meal_plans;

-- Look at sample data from daily_meals
SELECT 
  date,
  main_meal->>'title' as main_meal_title,
  kids_meal->>'title' as kids_meal_title,
  created_at
FROM daily_meals 
ORDER BY date 
LIMIT 10;

-- Check if there are any meals for today or recent dates
SELECT 
  date,
  main_meal->>'title' as main_meal_title,
  kids_meal->>'title' as kids_meal_title
FROM daily_meals 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date;

-- Check the structure of daily_meals table
\d daily_meals;
