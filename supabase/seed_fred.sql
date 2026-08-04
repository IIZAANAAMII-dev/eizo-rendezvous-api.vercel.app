-- ---------------------------------------------------------------------------
-- Seed: Créneaux Fred ROL pour le calendrier ColorEdge
-- Horaires : mardi et vendredi, 09:30-10:30 / 12:00-13:00 / 14:00-15:00 / 16:30-17:30
-- Congés : du 27/07 au 17/08/2026
-- Indisponibilités : 01/04/11/18 Sept, 06/09/13 Oct, 03/06 Nov 2026
-- ---------------------------------------------------------------------------

BEGIN;

-- 1. Organizer Fred ROL
INSERT INTO organizers (
  name,
  slug,
  email,
  specialty,
  description,
  active,
  slot_duration_minutes,
  buffer_minutes,
  working_days,
  notification_email,
  brand_color,
  locale,
  timezone
) VALUES (
  'Fred ROL',
  'coloredge',
  'klegarrec@feeder.fr',
  'ColorEdge',
  'Expert ColorEdge - rendez-vous personnalisés en magasin',
  true,
  60,
  0,
  '{}'::jsonb,
  'klegarrec@feeder.fr',
  '#0066CC',
  'fr-FR',
  'Europe/Paris'
)
ON CONFLICT DO NOTHING;

-- 2. Supprimer puis recréer les disponibilités et slots
DELETE FROM availability_slots
WHERE availability_id IN (
  SELECT id FROM availability
  WHERE organizer_id = (SELECT id FROM organizers WHERE slug = 'coloredge')
);

DELETE FROM availability
WHERE organizer_id = (SELECT id FROM organizers WHERE slug = 'coloredge');

WITH org AS (
  SELECT id FROM organizers WHERE slug = 'coloredge'
),
ins_av AS (
  INSERT INTO availability (organizer_id, day_of_week, is_available)
  SELECT org.id, dow, true
  FROM org, (VALUES (2), (5)) AS v(dow)
  RETURNING id, day_of_week
)
INSERT INTO availability_slots (availability_id, start_time, end_time)
SELECT av.id, '09:30:00'::time, '10:30:00'::time FROM ins_av av WHERE av.day_of_week = 2
UNION ALL
SELECT av.id, '12:00:00'::time, '13:00:00'::time FROM ins_av av WHERE av.day_of_week = 2
UNION ALL
SELECT av.id, '14:00:00'::time, '15:00:00'::time FROM ins_av av WHERE av.day_of_week = 2
UNION ALL
SELECT av.id, '16:30:00'::time, '17:30:00'::time FROM ins_av av WHERE av.day_of_week = 2
UNION ALL
SELECT av.id, '09:30:00'::time, '10:30:00'::time FROM ins_av av WHERE av.day_of_week = 5
UNION ALL
SELECT av.id, '12:00:00'::time, '13:00:00'::time FROM ins_av av WHERE av.day_of_week = 5
UNION ALL
SELECT av.id, '14:00:00'::time, '15:00:00'::time FROM ins_av av WHERE av.day_of_week = 5
UNION ALL
SELECT av.id, '16:30:00'::time, '17:30:00'::time FROM ins_av av WHERE av.day_of_week = 5;

-- 3. Exceptions de congés et indisponibilités
DELETE FROM availability_exceptions
WHERE organizer_id = (SELECT id FROM organizers WHERE slug = 'coloredge')
  AND (reason = 'Congés Fred' OR reason = 'Indisponibilité Fred');

INSERT INTO availability_exceptions (organizer_id, date, type, reason)
SELECT o.id, d::date, 'unavailable', 'Congés Fred'
FROM (SELECT id FROM organizers WHERE slug = 'coloredge') o,
     generate_series('2026-07-27'::date, '2026-08-17'::date, '1 day'::interval) d
ON CONFLICT DO NOTHING;

INSERT INTO availability_exceptions (organizer_id, date, type, reason)
SELECT o.id, v.d, 'unavailable', 'Indisponibilité Fred'
FROM (SELECT id FROM organizers WHERE slug = 'coloredge') o,
     (VALUES
       ('2026-09-01'::date),
       ('2026-09-04'::date),
       ('2026-09-11'::date),
       ('2026-09-18'::date),
       ('2026-10-06'::date),
       ('2026-10-09'::date),
       ('2026-10-13'::date),
       ('2026-11-03'::date),
       ('2026-11-06'::date)
     ) AS v(d)
ON CONFLICT DO NOTHING;

COMMIT;
