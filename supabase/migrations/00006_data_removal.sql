CREATE TABLE IF NOT EXISTS data_removal_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  id_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'address'
  id_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, id_type, id_value)
);

CREATE TABLE IF NOT EXISTS data_removal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'completed'
  sent_at TIMESTAMPTZ,
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, broker_id)
);

-- RLS Policies
ALTER TABLE data_removal_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own identities"
  ON data_removal_identities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own removal requests"
  ON data_removal_requests FOR ALL USING (auth.uid() = user_id);
