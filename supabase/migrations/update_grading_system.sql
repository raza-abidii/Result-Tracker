-- Update grading system to new specifications
-- Drop existing computed columns
ALTER TABLE public.results DROP COLUMN IF EXISTS grade CASCADE;
ALTER TABLE public.results DROP COLUMN IF EXISTS grade_points CASCADE;

-- Add new grade column with updated grading scale
ALTER TABLE public.results ADD COLUMN grade VARCHAR(2) GENERATED ALWAYS AS (
  case 
    when (cie_marks + external_marks) >= 85 then 'S'
    when (cie_marks + external_marks) >= 70 then 'A'
    when (cie_marks + external_marks) >= 60 then 'B'
    when (cie_marks + external_marks) >= 55 then 'C'
    when (cie_marks + external_marks) >= 50 then 'D'
    when (cie_marks + external_marks) >= 40 then 'E'
    when cie_marks = 0 and external_marks = 0 then 'Ab'
    else 'F'
  end
) STORED;

-- Add new grade_points column with updated point scale
ALTER TABLE public.results ADD COLUMN grade_points DECIMAL(3,1) GENERATED ALWAYS AS (
  case 
    when (cie_marks + external_marks) >= 85 then 10.0
    when (cie_marks + external_marks) >= 70 then 9.0
    when (cie_marks + external_marks) >= 60 then 8.0
    when (cie_marks + external_marks) >= 55 then 7.0
    when (cie_marks + external_marks) >= 50 then 6.0
    when (cie_marks + external_marks) >= 40 then 5.0
    when cie_marks = 0 and external_marks = 0 then 0.0
    else 0.0
  end
) STORED;

-- Update pass/fail criteria (only marks >= 40 pass)
UPDATE public.results SET result = 
  CASE 
    WHEN (cie_marks + external_marks) >= 40 THEN 'PASS'::result_status
    ELSE 'FAIL'::result_status
  END;

-- Add comment explaining new grading system
COMMENT ON COLUMN public.results.grade IS 'Grade scale: S(85-100)=10, A(70-84)=9, B(60-69)=8, C(55-59)=7, D(50-54)=6, E(40-49)=5, F(<40)=0, Ab(Absent)=0';
COMMENT ON COLUMN public.results.grade_points IS 'Grade points according to updated scale: S=10, A=9, B=8, C=7, D=6, E=5, F=0, Ab=0';