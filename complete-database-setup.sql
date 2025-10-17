-- Complete Database Setup for Exam Tracking System
-- Run this entire script in Supabase SQL Editor

-- Drop existing table if it exists (CAREFUL: This will delete all data)
DROP TABLE IF EXISTS public.results CASCADE;
DROP TYPE IF EXISTS public.result_status CASCADE;
DROP TYPE IF EXISTS public.semester CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE public.result_status AS ENUM ('PASS', 'FAIL');
CREATE TYPE public.semester AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8');

-- Create the main results table with all required columns and constraints
CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_ticket bigint NOT NULL CHECK (hall_ticket >= 160300000000 AND hall_ticket <= 160399999999),
  student_name varchar(100) NOT NULL,
  semester semester NOT NULL,
  subject_code varchar(20) NOT NULL,
  subject_name varchar(100) NOT NULL,
  credits integer NOT NULL CHECK (credits > 0 AND credits <= 10),
  cie_marks integer NOT NULL CHECK (cie_marks >= 0 AND cie_marks <= 30),
  external_marks integer NOT NULL CHECK (external_marks >= 0 AND external_marks <= 70),
  total integer GENERATED ALWAYS AS (cie_marks + external_marks) STORED,
  grade varchar(2) GENERATED ALWAYS AS (
    CASE 
      WHEN (cie_marks + external_marks) >= 85 THEN 'S'
      WHEN (cie_marks + external_marks) >= 70 THEN 'A'
      WHEN (cie_marks + external_marks) >= 60 THEN 'B'
      WHEN (cie_marks + external_marks) >= 55 THEN 'C'
      WHEN (cie_marks + external_marks) >= 50 THEN 'D'
      WHEN (cie_marks + external_marks) >= 40 AND cie_marks >= 12 AND external_marks >= 28 THEN 'E'
      ELSE 'F'
    END
  ) STORED,
  grade_points decimal(3,1) GENERATED ALWAYS AS (
    CASE 
      WHEN (cie_marks + external_marks) >= 85 THEN 10.0
      WHEN (cie_marks + external_marks) >= 70 THEN 9.0
      WHEN (cie_marks + external_marks) >= 60 THEN 8.0
      WHEN (cie_marks + external_marks) >= 55 THEN 7.0
      WHEN (cie_marks + external_marks) >= 50 THEN 6.0
      WHEN (cie_marks + external_marks) >= 40 AND cie_marks >= 12 AND external_marks >= 28 THEN 5.0
      ELSE 0.0
    END
  ) STORED,
  result result_status NOT NULL,
  is_backlog boolean GENERATED ALWAYS AS (
    CASE WHEN (cie_marks + external_marks) < 40 OR cie_marks < 12 OR external_marks < 28 THEN true ELSE false END
  ) STORED,
  academic_year varchar(9) NOT NULL CHECK (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  department varchar(100) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_results_hall_ticket ON public.results(hall_ticket);
CREATE INDEX idx_results_semester ON public.results(semester);
CREATE INDEX idx_results_academic_year ON public.results(academic_year);
CREATE INDEX idx_results_department ON public.results(department);
CREATE INDEX idx_results_grade ON public.results(grade);

-- Create a composite index for common queries
CREATE INDEX idx_results_student_semester ON public.results(hall_ticket, semester);

-- Enable Row Level Security (RLS)
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed based on your auth requirements)
CREATE POLICY "Enable read access for all users" ON public.results
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.results
  FOR UPDATE USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER handle_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create view for SGPA calculation
CREATE OR REPLACE VIEW public.student_sgpa AS
SELECT 
  hall_ticket,
  student_name,
  semester,
  academic_year,
  department,
  ROUND(
    SUM(credits * grade_points)::numeric / NULLIF(SUM(credits), 0), 2
  ) AS sgpa,
  SUM(credits) as total_credits,
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN grade = 'F' THEN 1 END) as backlogs
FROM public.results
GROUP BY hall_ticket, student_name, semester, academic_year, department;

-- Create view for CGPA calculation
CREATE OR REPLACE VIEW public.student_cgpa AS
SELECT 
  hall_ticket,
  student_name,
  academic_year,
  department,
  ROUND(
    SUM(credits * grade_points)::numeric / NULLIF(SUM(credits), 0), 2
  ) AS cgpa,
  SUM(credits) as total_credits,
  COUNT(DISTINCT semester) as completed_semesters,
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN grade = 'F' THEN 1 END) as total_backlogs
FROM public.results
GROUP BY hall_ticket, student_name, academic_year, department;

-- Grant necessary permissions
GRANT ALL ON public.results TO authenticated;
GRANT ALL ON public.results TO anon;
GRANT SELECT ON public.student_sgpa TO authenticated;
GRANT SELECT ON public.student_sgpa TO anon;
GRANT SELECT ON public.student_cgpa TO authenticated;
GRANT SELECT ON public.student_cgpa TO anon;

-- Insert sample data for testing (optional - remove if not needed)
INSERT INTO public.results (
  hall_ticket, student_name, semester, subject_code, subject_name, 
  credits, cie_marks, external_marks, result, academic_year, department
) VALUES 
(160301234567, 'John Doe', '1', 'CS101', 'Programming Fundamentals', 4, 25, 55, 'PASS', '2024-2025', 'CSE'),
(160301234567, 'John Doe', '1', 'MA101', 'Mathematics I', 4, 20, 45, 'PASS', '2024-2025', 'CSE'),
(160301234567, 'John Doe', '1', 'PH101', 'Physics', 3, 18, 50, 'PASS', '2024-2025', 'CSE');

-- Success message
SELECT 'Database setup completed successfully!' as message;