-- Check if required columns exist before creating views
DO $$ 
BEGIN
    -- Check if department column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'results' AND column_name = 'department'
    ) THEN
        RAISE EXCEPTION 'Department column does not exist. Please run add_department_column.sql first.';
    END IF;
    
    -- Check if academic_year column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'results' AND column_name = 'academic_year'
    ) THEN
        RAISE EXCEPTION 'Academic year column does not exist. Please run add_academic_year.sql first.';
    END IF;
END $$;

-- Drop existing views and recreate with updated SGPA/CGPA calculations
DROP VIEW IF EXISTS public.semester_sgpa_view CASCADE;
DROP VIEW IF EXISTS public.student_cgpa_view CASCADE;

-- Create updated semester SGPA view
-- SGPA = (total grade points × credits) / total credits per semester
CREATE VIEW public.semester_sgpa_view AS
SELECT 
  hall_ticket,
  student_name,
  department,
  academic_year,
  semester,
  COUNT(*) as total_subjects,
  SUM(credits) as total_credits,
  SUM(CASE WHEN result = 'FAIL' THEN 1 ELSE 0 END) as backlogs,
  ROUND(
    CASE 
      WHEN SUM(credits) > 0 THEN 
        SUM(grade_points * credits) / SUM(credits)
      ELSE 0 
    END, 2
  ) as sgpa,
  -- Grade distribution
  SUM(CASE WHEN grade = 'S' THEN 1 ELSE 0 END) as s_grades,
  SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as a_grades,
  SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as b_grades,
  SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as c_grades,
  SUM(CASE WHEN grade = 'D' THEN 1 ELSE 0 END) as d_grades,
  SUM(CASE WHEN grade = 'E' THEN 1 ELSE 0 END) as e_grades,
  SUM(CASE WHEN grade = 'F' THEN 1 ELSE 0 END) as f_grades,
  SUM(CASE WHEN grade = 'Ab' THEN 1 ELSE 0 END) as absent_grades
FROM public.results
GROUP BY hall_ticket, student_name, department, academic_year, semester
ORDER BY hall_ticket, semester;

-- Create updated student CGPA view  
-- CGPA = (total SGPA × credits) / total credits across all semesters
CREATE VIEW public.student_cgpa_view AS
WITH semester_data AS (
  SELECT 
    hall_ticket,
    student_name,
    department,
    academic_year,
    semester,
    total_credits,
    sgpa,
    backlogs
  FROM semester_sgpa_view
),
student_totals AS (
  SELECT 
    hall_ticket,
    student_name,
    department,
    academic_year,
    COUNT(DISTINCT semester) as completed_semesters,
    SUM(total_credits) as total_credits,
    SUM(backlogs) as total_backlogs,
    -- CGPA calculation: sum of (SGPA × semester_credits) / total_credits
    ROUND(
      CASE 
        WHEN SUM(total_credits) > 0 THEN 
          SUM(sgpa * total_credits) / SUM(total_credits)
        ELSE 0 
      END, 2
    ) as cgpa
  FROM semester_data
  GROUP BY hall_ticket, student_name, department, academic_year
)
SELECT 
  st.*,
  -- Academic status based on CGPA and backlogs
  CASE 
    WHEN st.total_backlogs = 0 AND st.cgpa >= 7.0 THEN 'Excellent'
    WHEN st.total_backlogs = 0 AND st.cgpa >= 5.0 THEN 'Good'
    WHEN st.total_backlogs <= 2 THEN 'Under Review'
    ELSE 'Detained'
  END as academic_status
FROM student_totals st;

-- Add comments explaining the calculation methods
COMMENT ON VIEW public.semester_sgpa_view IS 'SGPA calculation: (sum of grade_points × credits) / total_credits per semester';
COMMENT ON VIEW public.student_cgpa_view IS 'CGPA calculation: (sum of SGPA × semester_credits) / total_credits across all semesters';

-- Grant access permissions
GRANT SELECT ON public.semester_sgpa_view TO authenticated;
GRANT SELECT ON public.student_cgpa_view TO authenticated;