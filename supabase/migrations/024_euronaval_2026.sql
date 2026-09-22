BEGIN;

-- IBC 2026 est terminé : on conserve l'historique mais on désactive l'organizer
UPDATE organizers SET active = false WHERE slug = 'ibc-2026';

DO $$
DECLARE
  euronaval_id UUID;
BEGIN
  SELECT id INTO euronaval_id FROM organizers WHERE slug = 'euronaval-2026' LIMIT 1;

  IF euronaval_id IS NULL THEN
    INSERT INTO organizers (
      name, slug, email, specialty, description, active,
      slot_duration_minutes, buffer_minutes, working_days,
      notification_email, brand_color, locale, timezone,
      event_start_date, event_end_date, venue_name, venue_location, booth
    ) VALUES (
      'Équipe EIZO',
      'euronaval-2026',
      'ldesnos@feeder.fr',
      'EURONAVAL 2026',
      'HDR Reference Monitor|Color Management Monitors|Color Management Software Solutions|OLED Color Management Monitor',
      true,
      45,
      0,
      '{}'::jsonb,
      'ldesnos@feeder.fr',
      '#0066CC',
      'fr-FR',
      'Europe/Paris',
      '2026-11-03',
      '2026-11-06',
      'Paris Nord Villepinte',
      'Paris, France · Hall 6',
      NULL
    )
    RETURNING id INTO euronaval_id;
  ELSE
    UPDATE organizers SET
      name = 'Équipe EIZO',
      email = 'ldesnos@feeder.fr',
      specialty = 'EURONAVAL 2026',
      description = 'HDR Reference Monitor|Color Management Monitors|Color Management Software Solutions|OLED Color Management Monitor',
      active = true,
      slot_duration_minutes = 45,
      buffer_minutes = 0,
      notification_email = 'ldesnos@feeder.fr',
      brand_color = '#0066CC',
      locale = 'fr-FR',
      timezone = 'Europe/Paris',
      event_start_date = '2026-11-03',
      event_end_date = '2026-11-06',
      venue_name = 'Paris Nord Villepinte',
      venue_location = 'Paris, France · Hall 6',
      booth = NULL
    WHERE id = euronaval_id;
  END IF;

  DELETE FROM availability_slots
  WHERE availability_id IN (SELECT id FROM availability WHERE organizer_id = euronaval_id);
  DELETE FROM availability WHERE organizer_id = euronaval_id;

  -- EURONAVAL 2026 : mardi 3 → vendredi 6 novembre 2026, 10h00–17h30, créneaux de 45 min
  WITH schedules(day_of_week, starts, closes) AS (
    VALUES
      (2, '10:00'::time, '17:30'::time),
      (3, '10:00'::time, '17:30'::time),
      (4, '10:00'::time, '17:30'::time),
      (5, '10:00'::time, '17:30'::time)
  ), inserted AS (
    INSERT INTO availability (organizer_id, day_of_week, is_available)
    SELECT euronaval_id, day_of_week, true FROM schedules
    RETURNING id, day_of_week
  )
  INSERT INTO availability_slots (availability_id, start_time, end_time)
  SELECT inserted.id, slot_start::time, (slot_start + interval '45 minutes')::time
  FROM inserted
  JOIN schedules USING (day_of_week)
  CROSS JOIN LATERAL generate_series(
    date '2000-01-01' + schedules.starts,
    date '2000-01-01' + schedules.closes - interval '45 minutes',
    interval '45 minutes'
  ) AS slot_start;
END $$;

COMMIT;
