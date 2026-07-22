-- Table: shopify_connections
-- Stores Shopify OAuth access tokens for multiple shops

CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on shop_domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_connections_shop_domain ON shopify_connections(shop_domain);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
