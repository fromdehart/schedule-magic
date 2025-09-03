-- =====================================================
-- YumPlan Complete Database Setup Script
-- This script recreates ALL necessary database components
-- =====================================================

-- 1. CREATE THE MEAL_PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- 3. CREATE SECURITY POLICIES
-- =====================================================
-- Users can read their own meal plans
CREATE POLICY "Users can read own meal plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own meal plans
CREATE POLICY "Users can insert own meal plans"
  ON meal_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own meal plans
CREATE POLICY "Users can update own meal plans"
  ON meal_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own meal plans
CREATE POLICY "Users can delete own meal plans"
  ON meal_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. CREATE PERFORMANCE INDEXES
-- =====================================================
-- Index for efficient queries by user and week
CREATE INDEX IF NOT EXISTS meal_plans_user_id_week_start_idx 
  ON meal_plans(user_id, week_start);

-- Unique constraint to prevent duplicate meal plans for same user/week
CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_user_week_unique_idx 
  ON meal_plans(user_id, week_start);

-- 5. CREATE AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER update_meal_plans_updated_at 
  BEFORE UPDATE ON meal_plans 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 6. SET UP PERMISSIONS
-- =====================================================
-- Grant necessary permissions to authenticated users
GRANT ALL ON meal_plans TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. VERIFY THE SETUP
-- =====================================================
-- Check if table was created successfully
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'meal_plans';

-- Check if policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'meal_plans';

-- Check if indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'meal_plans';

-- 8. CREATE SAMPLE DATA (OPTIONAL)
-- =====================================================
-- Uncomment the following lines if you want to create sample data for testing
/*
INSERT INTO meal_plans (user_id, week_start, plan_data) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
  '2025-01-19', -- Sample week start (Sunday)
  '{
    "Sunday": {"mainMeal": null, "kidsMeal": null},
    "Monday": {"mainMeal": null, "kidsMeal": null},
    "Tuesday": {"mainMeal": null, "kidsMeal": null},
    "Wednesday": {"mainMeal": null, "kidsMeal": null},
    "Thursday": {"mainMeal": null, "kidsMeal": null},
    "Friday": {"mainMeal": null, "kidsMeal": null},
    "Saturday": {"mainMeal": null, "kidsMeal": null}
  }'::jsonb
);
*/

-- 9. FINAL VERIFICATION
-- =====================================================
-- Show the complete table structure
\d+ meal_plans;

-- Show all policies
\dp+ meal_plans;

-- Show all indexes
\di+ meal_plans*;
