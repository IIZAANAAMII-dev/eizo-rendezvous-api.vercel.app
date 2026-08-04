-- ---------------------------------------------------------------------------
-- Migration: Ajout de la validation par email pour les réservations
-- ---------------------------------------------------------------------------

-- Colonne token de confirmation (nullable pour les anciennes réservations)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Index unique sur le token pour des lookups rapides
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_confirmation_token
  ON bookings(confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- Les nouvelles réservations démarrent en attente de validation
ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending';
