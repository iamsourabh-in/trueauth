-- Table to store Google OAuth tokens
CREATE TABLE public.user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gmail_token TEXT NOT NULL,
    calendar_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user_id
CREATE INDEX idx_user_tokens_user_id ON public.user_tokens(user_id);

-- Table to audit/log automatic cleanup actions (to allow reverting)
CREATE TABLE public.cleanup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- e.g., 'archive_promotions', 'delete_otp'
    thread_id TEXT NOT NULL,
    original_label_ids TEXT[], -- Store as array using text
    action_taken_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'reverted'
    metadata JSONB -- Additional info, like snippets or sender
);

CREATE INDEX idx_cleanup_log_user_id ON public.cleanup_log(user_id);
