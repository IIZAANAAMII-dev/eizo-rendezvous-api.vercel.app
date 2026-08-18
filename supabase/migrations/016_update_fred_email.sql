-- Update Fred ROL organizer email to fred.rol@feeder.fr

UPDATE organizers
SET
  email = 'fred.rol@feeder.fr',
  notification_email = 'fred.rol@feeder.fr'
WHERE slug = 'coloredge';
