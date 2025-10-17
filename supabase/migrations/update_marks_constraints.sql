-- Update marks constraints to allow CIE (0-30) and External (0-70) for total 100 marks
-- This migration updates existing constraints to match the new marking scheme

-- Drop existing check constraints
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_cie_marks_check;
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_external_marks_check;

-- Add new check constraints with updated limits
ALTER TABLE public.results ADD CONSTRAINT results_cie_marks_check 
  CHECK (cie_marks >= 0 AND cie_marks <= 30);

ALTER TABLE public.results ADD CONSTRAINT results_external_marks_check 
  CHECK (external_marks >= 0 AND external_marks <= 70);

-- Update the minimum passing criteria in grade calculation
-- Note: The grade and grade_points columns will be updated by the update_grading_system.sql migration
