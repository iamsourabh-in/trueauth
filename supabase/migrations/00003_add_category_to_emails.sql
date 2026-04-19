-- Add category column to emails table
ALTER TABLE public.emails ADD COLUMN category VARCHAR(50) DEFAULT 'other';

-- Index for categorization performance
CREATE INDEX idx_emails_category ON public.emails(category);
