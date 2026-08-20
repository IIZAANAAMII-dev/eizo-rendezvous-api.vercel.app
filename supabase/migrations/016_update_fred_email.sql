-- Update Fred ROL organizer email to klegarrec@feeder.fr

UPDATE organizers
SET
  email = 'klegarrec@feeder.fr',
  notification_email = 'klegarrec@feeder.fr'
WHERE slug = 'coloredge';
