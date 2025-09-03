-- Daily Meals Database Schema
-- This replaces the week-based meal_plans approach with individual day entries

-- Create the daily_meals table
CREATE TABLE IF NOT EXISTS daily_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  main_meal jsonb,
  kids_meal jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE daily_meals ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can read own daily meals"
  ON daily_meals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily meals"
  ON daily_meals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily meals"
  ON daily_meals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily meals"
  ON daily_meals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS daily_meals_user_id_date_idx 
  ON daily_meals(user_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS daily_meals_user_date_unique_idx 
  ON daily_meals(user_id, date);

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_daily_meals_updated_at ON daily_meals;
CREATE TRIGGER update_daily_meals_updated_at 
  BEFORE UPDATE ON daily_meals 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON daily_meals TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Migration: Copy existing data from meal_plans to daily_meals
-- This will preserve existing meal plans during the transition
INSERT INTO daily_meals (user_id, date, main_meal, kids_meal, created_at, updated_at)
SELECT 
  mp.user_id,
  (mp.week_start + (day_offset || ' days')::interval)::date as date,
  CASE 
    WHEN mp.plan_data->(day_name)->>'mainMeal' IS NOT NULL AND mp.plan_data->(day_name)->>'mainMeal' != 'null' 
    THEN mp.plan_data->(day_name)->'mainMeal'
    ELSE NULL
  END as main_meal,
  CASE 
    WHEN mp.plan_data->(day_name)->>'kidsMeal' IS NOT NULL AND mp.plan_data->(day_name)->>'kidsMeal' != 'null' 
    THEN mp.plan_data->(day_name)->'kidsMeal'
    ELSE NULL
  END as kids_meal,
  mp.created_at,
  mp.updated_at
FROM meal_plans mp
CROSS JOIN (
  VALUES 
    (0, 'Sunday'),
    (1, 'Monday'), 
    (2, 'Tuesday'),
    (3, 'Wednesday'),
    (4, 'Thursday'),
    (5, 'Friday'),
    (6, 'Saturday')
) AS days(day_offset, day_name)
WHERE mp.plan_data IS NOT NULL
ON CONFLICT (user_id, date) DO NOTHING;

-- Optional: Drop the old meal_plans table after confirming migration worked
-- DROP TABLE IF EXISTS meal_plans;
