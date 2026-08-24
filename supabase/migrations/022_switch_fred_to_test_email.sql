-- Passe l'expert ColorEdge en mode test (emails organisateur -> klegarrec@feeder.fr)
UPDATE organizers
SET email = 'klegarrec@feeder.fr',
    notification_email = 'klegarrec@feeder.fr'
WHERE slug = 'coloredge';
