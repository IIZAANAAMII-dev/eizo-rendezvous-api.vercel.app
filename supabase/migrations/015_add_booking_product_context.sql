-- ---------------------------------------------------------------------------
-- Migration 015 : Ajout du contexte produit aux réservations
-- ---------------------------------------------------------------------------
-- Stockage des produits consultés, du produit demandé et du besoin client.

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS requested_product JSONB,
  ADD COLUMN IF NOT EXISTS products_viewed JSONB,
  ADD COLUMN IF NOT EXISTS customer_need TEXT,
  ADD COLUMN IF NOT EXISTS customer_usage TEXT;

COMMENT ON COLUMN bookings.requested_product IS 'Produit principal pour la démonstration (titre, handle, url, productId)';
COMMENT ON COLUMN bookings.products_viewed IS 'Historique des produits ColorEdge consultés avant la réservation';
COMMENT ON COLUMN bookings.customer_need IS 'Besoin exprimé par le client';
COMMENT ON COLUMN bookings.customer_usage IS 'Domaine d utilisation principal (Photographie, Vidéo, etc.)';

COMMIT;
