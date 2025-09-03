-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  categories TEXT[] DEFAULT '{}',
  date DATE,
  time TIME,
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_shared BOOLEAN DEFAULT false,
  shared_with TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'planned', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  estimated_duration INTEGER, -- in minutes
  cost_estimate TEXT,
  age_appropriate TEXT,
  weather_dependent BOOLEAN DEFAULT false,
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_categories ON activities USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_activities_shared_with ON activities USING GIN(shared_with);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared activities" ON activities
  FOR SELECT USING (
    is_shared = true OR 
    auth.uid()::text = ANY(shared_with) OR
    auth.jwt() ->> 'email' = ANY(shared_with)
  );

CREATE POLICY "Users can insert their own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_activities_updated_at 
  BEFORE UPDATE ON activities 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
