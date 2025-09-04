-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity to contacts association table (many-to-many)
CREATE TABLE IF NOT EXISTS activity_contacts (
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (activity_id, contact_id)
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_contacts ENABLE ROW LEVEL SECURITY;

-- Policies for contacts: user can manage own contacts
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for activity_contacts: only owner of activity and contact can manage
CREATE POLICY "Users can view their activity contacts" ON activity_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_contacts.activity_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their activity contacts" ON activity_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_contacts.activity_id AND a.user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = activity_contacts.contact_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their activity contacts" ON activity_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_contacts.activity_id AND a.user_id = auth.uid()
    )
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity_id ON activity_contacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_contact_id ON activity_contacts(contact_id);


