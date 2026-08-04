-- ---------------------------------------------------------------------------
-- Migration 012 : Consolidation du schéma (source de vérité = base de données)
-- ---------------------------------------------------------------------------
-- Objectifs :
--   1. Créer la table `bookings` manquante avec organizer_id UUID FK.
--   2. Normaliser organizer_id en UUID partout et ajouter les FK vers organizers.
--   3. Conserver la table `appointments` existante (pas de suppression de données).
--   4. Tous les ajouts utilisent IF NOT EXISTS / IF NOT EXISTS : ré-exécutable.
-- ---------------------------------------------------------------------------

BEGIN;

-- ==========================================================================
-- 0. organizers — compléter les champs manquants pour la source unique du widget
-- ==========================================================================

ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS working_days JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_email TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr-FR';

-- Index sur le slug reste utile pour les requêtes public
CREATE INDEX IF NOT EXISTS idx_organizers_slug ON organizers(slug);

-- ==========================================================================
-- 1. bookings — création si absente (migration 011 n'a pas été appliquée)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_notes TEXT,
  product_title TEXT,
  product_handle TEXT,
  product_id TEXT,
  shop_domain TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  confirmation_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_organizer_id ON bookings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer_date ON bookings(organizer_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON bookings(confirmation_token);

-- Évite le double booking pour le même créneau (hors annulations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_booking_slot
  ON bookings(organizer_id, date, start_time)
  WHERE status != 'cancelled';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_bookings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at_column();

-- ==========================================================================
-- 2. Helpers pour ajouter des contraintes FK de manière idempotente
-- ==========================================================================
CREATE OR REPLACE FUNCTION add_fk_if_missing(
  p_table text,
  p_column text,
  p_ref_table text,
  p_ref_column text,
  p_constraint_name text
)
RETURNS void AS $$
DECLARE
  v_exists integer;
BEGIN
  SELECT 1 INTO v_exists
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = p_table
    AND kcu.column_name = p_column;

  IF v_exists IS NULL THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE CASCADE',
      p_table, p_constraint_name, p_column, p_ref_table, p_ref_column
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_index_if_missing(
  p_table text,
  p_column text,
  p_index_name text
)
RETURNS void AS $$
DECLARE
  v_exists integer;
BEGIN
  SELECT 1 INTO v_exists
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = p_table AND indexname = p_index_name;

  IF v_exists IS NULL THEN
    EXECUTE format(
      'CREATE INDEX %I ON public.%I (%I)',
      p_index_name, p_table, p_column
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- 3. Normaliser organizer_id en UUID et ajouter les FK sur les tables filles
-- ==========================================================================

-- availability
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS organizer_id UUID;

-- Nettoyage : si la colonne existe déjà en TEXT, convertir en UUID quand c'est possible.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'availability'
      AND column_name = 'organizer_id' AND data_type = 'text'
  ) THEN
    -- Vérifie qu'aucune valeur ne gêne la conversion
    IF EXISTS (
      SELECT 1 FROM availability
      WHERE organizer_id IS NOT NULL
        AND organizer_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ) THEN
      RAISE EXCEPTION 'availability.organizer_id contient des valeurs non-UUID. Migration interrompue pour protéger les données.';
    END IF;

    ALTER TABLE availability ALTER COLUMN organizer_id TYPE UUID USING organizer_id::uuid;
  END IF;
END $$;

SELECT add_fk_if_missing('availability', 'organizer_id', 'organizers', 'id', 'fk_availability_organizer');
SELECT add_index_if_missing('availability', 'organizer_id', 'idx_availability_organizer_id');

-- availability_exceptions
ALTER TABLE availability_exceptions
  ADD COLUMN IF NOT EXISTS organizer_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'availability_exceptions'
      AND column_name = 'organizer_id' AND data_type = 'text'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM availability_exceptions
      WHERE organizer_id IS NOT NULL
        AND organizer_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ) THEN
      RAISE EXCEPTION 'availability_exceptions.organizer_id contient des valeurs non-UUID. Migration interrompue pour protéger les données.';
    END IF;

    ALTER TABLE availability_exceptions ALTER COLUMN organizer_id TYPE UUID USING organizer_id::uuid;
  END IF;
END $$;

SELECT add_fk_if_missing('availability_exceptions', 'organizer_id', 'organizers', 'id', 'fk_availability_exceptions_organizer');
SELECT add_index_if_missing('availability_exceptions', 'organizer_id', 'idx_availability_exceptions_organizer_id');

-- booking_settings
ALTER TABLE booking_settings
  ADD COLUMN IF NOT EXISTS organizer_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_settings'
      AND column_name = 'organizer_id' AND data_type = 'text'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM booking_settings
      WHERE organizer_id IS NOT NULL
        AND organizer_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ) THEN
      RAISE EXCEPTION 'booking_settings.organizer_id contient des valeurs non-UUID. Migration interrompue pour protéger les données.';
    END IF;

    ALTER TABLE booking_settings ALTER COLUMN organizer_id TYPE UUID USING organizer_id::uuid;
  END IF;
END $$;

SELECT add_fk_if_missing('booking_settings', 'organizer_id', 'organizers', 'id', 'fk_booking_settings_organizer');
SELECT add_index_if_missing('booking_settings', 'organizer_id', 'idx_booking_settings_organizer_id');

-- blocked_dates
ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS organizer_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocked_dates'
      AND column_name = 'organizer_id' AND data_type = 'text'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM blocked_dates
      WHERE organizer_id IS NOT NULL
        AND organizer_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ) THEN
      RAISE EXCEPTION 'blocked_dates.organizer_id contient des valeurs non-UUID. Migration interrompue pour protéger les données.';
    END IF;

    ALTER TABLE blocked_dates ALTER COLUMN organizer_id TYPE UUID USING organizer_id::uuid;
  END IF;
END $$;

SELECT add_fk_if_missing('blocked_dates', 'organizer_id', 'organizers', 'id', 'fk_blocked_dates_organizer');
SELECT add_index_if_missing('blocked_dates', 'organizer_id', 'idx_blocked_dates_organizer_id');

-- ==========================================================================
-- 4. Nettoyage des fonctions temporaires
-- ==========================================================================
DROP FUNCTION IF EXISTS add_fk_if_missing;
DROP FUNCTION IF EXISTS add_index_if_missing;

COMMIT;
