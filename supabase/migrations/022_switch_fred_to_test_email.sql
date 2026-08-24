-- Passe l'expert ColorEdge en production (emails organisateur -> fred@eizo.fr)
UPDATE organizers
SET email = 'fred@eizo.fr',
    notification_email = 'fred@eizo.fr'
WHERE slug = 'coloredge';
