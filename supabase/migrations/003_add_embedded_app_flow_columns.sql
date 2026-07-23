-- Migration: Add columns for Shopify CLI v4 embedded app flow
-- This migration adds support for the new embedded app flow with JWT tokens

-- Add columns for embedded app flow
ALTER TABLE shopify_connections
ADD COLUMN IF NOT EXISTS id_token TEXT,
ADD COLUMN IF NOT EXISTS session_token TEXT,
ADD COLUMN IF NOT EXISTS embedded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dest TEXT,
ADD COLUMN IF NOT EXISTS aud TEXT;

-- Add index on embedded flag for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_connections_embedded ON shopify_connections(embedded);

-- Add index on shop_domain and embedded combined
CREATE INDEX IF NOT EXISTS idx_shopify_connections_shop_domain_embedded ON shopify_connections(shop_domain, embedded);
