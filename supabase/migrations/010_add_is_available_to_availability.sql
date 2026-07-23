-- Migration: Add is_available column to availability table
-- This allows marking days as available or unavailable

ALTER TABLE availability
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
