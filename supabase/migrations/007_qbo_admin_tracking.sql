-- File: 007_qbo_admin_tracking.sql
-- Purpose: Add admin tracking and enforce one active connection per company

ALTER TABLE public.qbo_tokens
ADD COLUMN admin_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN previous_user_id TEXT;

DROP INDEX IF EXISTS idx_qbo_tokens_unique_active;

CREATE UNIQUE INDEX idx_qbo_tokens_unique_company 
ON public.qbo_tokens(realm_id)
WHERE is_active = true;

CREATE TABLE public.qbo_admin_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id TEXT NOT NULL,
    previous_user_id TEXT,
    new_user_id TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_qbo_admin_changes_realm ON public.qbo_admin_changes(realm_id);