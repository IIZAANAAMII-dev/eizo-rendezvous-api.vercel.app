-- Met à jour l'email de l'organizer ColorEdge vers l'adresse de test
-- (utile si la migration 016 a déjà été appliquée avec l'email de Fred)

UPDATE organizers
SET
  email = 'klegarrec@feeder.fr',
  notification_email = 'klegarrec@feeder.fr'
WHERE slug = 'coloredge';
