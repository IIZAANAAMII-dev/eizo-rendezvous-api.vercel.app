BEGIN;

-- Empêche deux réservations actives (pending/confirmed) sur le même créneau.
-- Si la création échoue, il existe déjà des doublons : les annuler d'abord avec
--   UPDATE bookings SET status = 'cancelled', cancelled_at = now()
--   WHERE id IN (SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY organizer_id, date, start_time ORDER BY created_at) rn
--     FROM bookings WHERE status IN ('pending','confirmed')) t WHERE rn > 1);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_active_slot
  ON bookings (organizer_id, date, start_time)
  WHERE status IN ('pending', 'confirmed');

COMMIT;
