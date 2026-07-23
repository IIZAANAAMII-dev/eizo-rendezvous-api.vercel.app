-- Add profile fields to organizers table
ALTER TABLE organizers 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Paris',
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_organizers_email ON organizers(email);
CREATE INDEX IF NOT EXISTS idx_organizers_slug ON organizers(slug);
