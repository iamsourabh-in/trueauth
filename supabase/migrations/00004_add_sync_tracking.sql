-- Add last_sync_at to user_tokens to support incremental syncing
ALTER TABLE public.user_tokens ADD COLUMN last_sync_at TIMESTAMPTZ;

-- Table to store sync history/stats (optional but useful)
CREATE TABLE public.sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    emails_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success'
);
