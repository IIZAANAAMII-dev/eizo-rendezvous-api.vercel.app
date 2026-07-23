-- Migration: Make access_token nullable for embedded app flow
-- Embedded apps use id_token for identity verification, not access_token
-- The access_token is only used for legacy OAuth flow

-- Make access_token nullable
ALTER TABLE shopify_connections
ALTER COLUMN access_token DROP NOT NULL;
