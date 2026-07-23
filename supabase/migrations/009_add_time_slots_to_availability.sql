-- Migration: Add time_slots JSONB column to availability table
-- This allows multiple time slots per day

ALTER TABLE availability
ADD COLUMN IF NOT EXISTS time_slots JSONB DEFAULT '[]'::jsonb;

-- Remove old start_time and end_time columns if they exist
ALTER TABLE availability
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time;
