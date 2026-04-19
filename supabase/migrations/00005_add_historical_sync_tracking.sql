-- Add initial sync status tracking
ALTER TABLE public.user_tokens ADD COLUMN initial_sync_status VARCHAR(20) DEFAULT 'pending'; -- pending, in_progress, completed
ALTER TABLE public.user_tokens ADD COLUMN initial_sync_next_page_token TEXT;
