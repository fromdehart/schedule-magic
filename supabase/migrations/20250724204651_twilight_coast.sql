/*
  # Create meal_plans table for YumPlan

  1. New Tables
    - `meal_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `week_start` (date, the Sunday date of the week)
      - `plan_data` (jsonb, stores the weekly meal plan data)
      - `created_at` (timestamptz, when the record was created)
      - `updated_at` (timestamptz, when the record was last updated)

  2. Security
    - Enable RLS on `meal_plans` table
    - Add policy for authenticated users to read their own meal plans
    - Add policy for authenticated users to insert their own meal plans
    - Add policy for authenticated users to update their own meal plans
    - Add policy for authenticated users to delete their own meal plans

  3. Indexes
    - Add index on user_id and week_start for efficient queries
*/

-- Create the meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read own meal plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plans"
  ON meal_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON meal_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans"
  ON meal_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS meal_plans_user_id_week_start_idx 
  ON meal_plans(user_id, week_start);

-- Create a unique constraint to prevent duplicate meal plans for the same user and week
CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_user_week_unique_idx 
  ON meal_plans(user_id, week_start);