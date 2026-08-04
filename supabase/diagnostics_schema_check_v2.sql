-- ---------------------------------------------------------------------------
-- READ-ONLY diagnostic v2 — compatible avec un schéma où "bookings" n'existe
-- pas encore (migration 011 non appliquée). Exécute et envoie le texte brut.
-- ---------------------------------------------------------------------------

-- 1. Tables effectivement présentes dans le schéma public
select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

-- 2. Colonnes id/organizer_id des tables présentes
select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name in ('id', 'organizer_id', 'shopify_connection_id')
  and table_name in ('organizers', 'appointments', 'availability',
                     'availability_exceptions', 'availability_slots',
                     'booking_settings', 'blocked_dates', 'shopify_connections')
order by table_name, column_name;

-- 3. Contraintes FK existantes
select tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name as references_table, ccu.column_name as references_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by tc.table_name;

-- 4. Colonnes de la table availability (savoir si time_slots JSONB existe encore)
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'availability'
order by ordinal_position;

-- 5. Aperçu des données
select 'organizers' as table_name, id, name, slug, shopify_connection_id::text
from organizers
limit 20;

select 'appointments_count' as metric, count(*)::text as value from appointments;

select 'appointments' as table_name, organizer_id, count(*)
from appointments
group by organizer_id;
