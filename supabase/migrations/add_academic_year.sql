-- Add academic year field to results table
ALTER TABLE public.results 
ADD COLUMN academic_year varchar(9) NOT NULL DEFAULT '2024-2025';

-- Update the constraint to make academic_year required for new entries
ALTER TABLE public.results 
ALTER COLUMN academic_year DROP DEFAULT;

-- Add a check constraint for academic year format (YYYY-YYYY)
ALTER TABLE public.results 
ADD CONSTRAINT check_academic_year_format 
CHECK (academic_year ~ '^\d{4}-\d{4}$' AND 
       CAST(RIGHT(academic_year, 4) AS INTEGER) = CAST(LEFT(academic_year, 4) AS INTEGER) + 1);

-- Create an index for better performance on academic year queries
CREATE INDEX idx_results_academic_year ON public.results(academic_year);

-- Add comment to document the field
COMMENT ON COLUMN public.results.academic_year IS 'Academic year in format YYYY-YYYY (e.g., 2024-2025)';