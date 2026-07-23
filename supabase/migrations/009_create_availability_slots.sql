-- Migration: Create availability_slots table for relational time slots
-- This allows multiple time slots per day with proper normalization

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_availability_slots_availability_id ON availability_slots(availability_id);
