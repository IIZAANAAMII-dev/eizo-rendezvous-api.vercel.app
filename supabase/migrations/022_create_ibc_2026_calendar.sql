BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_language TEXT NOT NULL DEFAULT 'fr';

ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS event_start_date DATE,
  ADD COLUMN IF NOT EXISTS event_end_date DATE,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_location TEXT,
  ADD COLUMN IF NOT EXISTS booth TEXT;

DO $$
DECLARE
  ibc_id UUID;
BEGIN
  SELECT id INTO ibc_id FROM organizers WHERE slug = 'ibc-2026' LIMIT 1;

  IF ibc_id IS NULL THEN
    INSERT INTO organizers (
      name, slug, email, specialty, description, active,
      slot_duration_minutes, buffer_minutes, working_days,
      notification_email, brand_color, locale, timezone,
      event_start_date, event_end_date, venue_name, venue_location, booth
    ) VALUES (
      'Équipe EIZO',
      'ibc-2026',
      'klegarrec@feeder.fr',
      'IBC 2026',
      'HDR Reference Monitor|Color Management Monitors|Color Management Software Solutions|OLED Color Management Monitor',
      true,
      41,
      0,
      '{}'::jsonb,
      'klegarrec@feeder.fr',
      '#0066CC',
      'fr-FR',
      'Europe/Amsterdam',
      '2026-09-11',
      '2026-09-14',
      'RAI Amsterdam',
      'Amsterdam, the Netherlands',
      '7.D33'
    )
    RETURNING id INTO ibc_id;
  ELSE
    UPDATE organizers SET
      name = 'Équipe EIZO',
      email = 'klegarrec@feeder.fr',
      specialty = 'IBC 2026',
      description = 'HDR Reference Monitor|Color Management Monitors|Color Management Software Solutions|OLED Color Management Monitor',
      active = true,
      slot_duration_minutes = 41,
      buffer_minutes = 0,
      notification_email = 'klegarrec@feeder.fr',
      brand_color = '#0066CC',
      locale = 'fr-FR',
      timezone = 'Europe/Amsterdam',
      event_start_date = '2026-09-11',
      event_end_date = '2026-09-14',
      venue_name = 'RAI Amsterdam',
      venue_location = 'Amsterdam, the Netherlands',
      booth = '7.D33'
    WHERE id = ibc_id;
  END IF;

  DELETE FROM availability_slots
  WHERE availability_id IN (SELECT id FROM availability WHERE organizer_id = ibc_id);
  DELETE FROM availability WHERE organizer_id = ibc_id;

  WITH schedules(day_of_week, starts, closes) AS (
    VALUES
      (5, '10:30'::time, '17:30'::time),
      (6, '10:00'::time, '17:30'::time),
      (0, '10:00'::time, '17:30'::time),
      (1, '10:00'::time, '16:00'::time)
  ), inserted AS (
    INSERT INTO availability (organizer_id, day_of_week, is_available)
    SELECT ibc_id, day_of_week, true FROM schedules
    RETURNING id, day_of_week
  )
  INSERT INTO availability_slots (availability_id, start_time, end_time)
  SELECT inserted.id, slot_start::time, (slot_start + interval '41 minutes')::time
  FROM inserted
  JOIN schedules USING (day_of_week)
  CROSS JOIN LATERAL generate_series(
    date '2000-01-01' + schedules.starts,
    date '2000-01-01' + schedules.closes - interval '41 minutes',
    interval '41 minutes'
  ) AS slot_start;
END $$;

COMMIT;
