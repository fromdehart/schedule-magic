-- Create inventory locations table
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default locations
INSERT INTO inventory_locations (name, display_name, icon, sort_order) VALUES
  ('pantry', 'Pantry', 'Pantry', 1),
  ('fridge', 'Fridge', 'Fridge', 2),
  ('freezer', 'Freezer', 'Freezer', 3)
ON CONFLICT (name) DO NOTHING;

-- Create inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit TEXT,
  category TEXT,
  notes TEXT,
  estimated_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory audit log table
CREATE TABLE IF NOT EXISTS inventory_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  raw_input TEXT,
  processed_items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_id ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_user_id ON inventory_audit_log(user_id);

-- Enable RLS
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own inventory items" ON inventory_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory items" ON inventory_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items" ON inventory_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items" ON inventory_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit log" ON inventory_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit log entries" ON inventory_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read access to locations
CREATE POLICY "Anyone can view inventory locations" ON inventory_locations
  FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
