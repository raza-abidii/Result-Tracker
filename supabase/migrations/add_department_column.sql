-- Add department field to results table
ALTER TABLE public.results 
ADD COLUMN department VARCHAR(100) NOT NULL DEFAULT 'Computer Science Engineering';

-- Update the constraint to make department required for new entries
ALTER TABLE public.results 
ALTER COLUMN department DROP DEFAULT;

-- Create an index for better performance on department queries
CREATE INDEX idx_results_department ON public.results(department);

-- Add comment to document the field
COMMENT ON COLUMN public.results.department IS 'Student department/course (CSE, IT, EEE, ECE, Mech, CE, Civil)';