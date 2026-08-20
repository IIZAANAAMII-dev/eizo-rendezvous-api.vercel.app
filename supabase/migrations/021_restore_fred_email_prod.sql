-- Passe l'expert ColorEdge en production (fred@eizo.fr)
-- Déplace les doublons sur un email legacy avant d'affecter fred@eizo.fr au slug coloredge
UPDATE organizers
SET email = slug || '.' || email
WHERE email = 'fred@eizo.fr'
  AND slug != 'coloredge';

UPDATE organizers
SET email = 'fred@eizo.fr',
    notification_email = 'fred@eizo.fr'
WHERE slug = 'coloredge';
