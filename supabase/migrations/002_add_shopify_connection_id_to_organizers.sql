-- Ajouter shopify_connection_id à organizers pour lier les organisateurs aux shops Shopify
ALTER TABLE organizers 
ADD COLUMN shopify_connection_id UUID REFERENCES shopify_connections(id);

-- Créer index pour filtrer par shop
CREATE INDEX idx_organizers_shopify_connection_id ON organizers(shopify_connection_id);

-- Les organizers existants auront shopify_connection_id NULL
-- Ils seront liés lors de la première connexion admin
