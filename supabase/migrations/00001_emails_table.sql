-- Table to store emails for analysis
CREATE TABLE public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    sender TEXT,
    subject TEXT,
    snippet TEXT,
    body_plain TEXT,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per message_id
    CONSTRAINT unique_message_id UNIQUE (message_id)
);

-- Indexing for performance
CREATE INDEX idx_emails_user_id ON public.emails(user_id);
CREATE INDEX idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX idx_emails_received_at ON public.emails(received_at);

-- Enable RLS for security
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own emails"
    ON public.emails FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails"
    ON public.emails FOR INSERT
    WITH CHECK (auth.uid() = user_id);
