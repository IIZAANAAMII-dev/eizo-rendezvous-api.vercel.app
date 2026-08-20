-- ---------------------------------------------------------------------------
-- Migration 017 : Workflow accept/refuse/gestion + token client
-- ---------------------------------------------------------------------------
--
-- 1. Ajoute le statut 'refused' pour distinguer un refus expert d'une
--    annulation client. Les créneaux 'refused' et 'cancelled' sont libérés.
-- 2. Ajoute un token de gestion client sécurisé (modify/cancel).
-- 3. Normalise l'index unique de créneau pour exclure refused + cancelled.
--

BEGIN;

-- 1. Statut refused
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refused_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND constraint_name = 'bookings_status_check'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
  END IF;

  ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'refused', 'cancelled', 'completed', 'no_show'));
END $$;

-- 2. Token de gestion client
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS management_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_management_token
  ON bookings(management_token)
  WHERE management_token IS NOT NULL;

-- 3. Libère aussi les créneaux 'refused'
DROP INDEX IF EXISTS idx_unique_booking_slot;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_booking_slot
  ON bookings(organizer_id, date, start_time)
  WHERE status NOT IN ('cancelled', 'refused');

COMMIT;
