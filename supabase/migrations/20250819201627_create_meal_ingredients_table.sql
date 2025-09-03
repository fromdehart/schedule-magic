-- Create the meal_ingredients table
CREATE TABLE IF NOT EXISTS public.meal_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  ingredients_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own ingredients
CREATE POLICY "Users can view own meal ingredients" ON public.meal_ingredients
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own ingredients
CREATE POLICY "Users can insert own meal ingredients" ON public.meal_ingredients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own ingredients
CREATE POLICY "Users can update own meal ingredients" ON public.meal_ingredients
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own ingredients
CREATE POLICY "Users can delete own meal ingredients" ON public.meal_ingredients
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_meal_ingredients_user_day ON public.meal_ingredients(user_id, day);
