-- Add last_sync_at to user_tokens to support incremental syncing
ALTER TABLE public.user_tokens ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Table to store sync history/stats
CREATE TABLE IF NOT EXISTS public.sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    emails_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON public.sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON public.sync_log(created_at);

-- Enable RLS
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own sync logs') THEN
        CREATE POLICY "Users can view their own sync logs"
            ON public.sync_log FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;
