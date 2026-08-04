-- ---------------------------------------------------------------------------
-- Migration: Autoriser les statuts pending et cancelled sur bookings
-- ---------------------------------------------------------------------------

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));
