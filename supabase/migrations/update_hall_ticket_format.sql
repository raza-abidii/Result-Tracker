-- Migration to update hall_ticket format to 1603XXXXXXXX
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the old constraint if it exists
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_hall_ticket_check;

-- Step 2: Add new constraint for 1603XXXXXXXX format (160300000000 to 160399999999)
ALTER TABLE public.results 
ADD CONSTRAINT results_hall_ticket_check 
CHECK (hall_ticket >= 160300000000 AND hall_ticket <= 160399999999);

-- Step 3: Add comment to document the new format
COMMENT ON COLUMN public.results.hall_ticket IS 'Hall ticket number in format 1603XXXXXXXX (12 digits starting with 1603)';

-- Step 4: Make the column NOT NULL if it isn't already
ALTER TABLE public.results ALTER COLUMN hall_ticket SET NOT NULL;

-- Step 5: Recreate the index for better performance
DROP INDEX IF EXISTS idx_results_hall_ticket;
CREATE INDEX idx_results_hall_ticket ON public.results(hall_ticket);