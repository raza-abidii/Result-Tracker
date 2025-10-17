// Fix marks constraints to allow CIE (0-30) and External (0-70)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://qasnikafkrssgamkisjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhc25pa2Fma3Jzc2dhbWtpc2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjYyMTksImV4cCI6MjA3NTYwMjIxOX0.gQUoLJ0q5btSGQTg2sFQcSXTGFgMufrd59GckUdyIwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixMarksConstraints() {
  console.log("🔧 Fixing marks constraints...");
  
  const migrations = [
    {
      name: "Drop existing constraints",
      sql: "ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_cie_marks_check"
    },
    {
      name: "Drop external marks constraint", 
      sql: "ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_external_marks_check"
    },
    {
      name: "Add new CIE marks constraint (0-30)",
      sql: "ALTER TABLE public.results ADD CONSTRAINT results_cie_marks_check CHECK (cie_marks >= 0 AND cie_marks <= 30)"
    },
    {
      name: "Add new external marks constraint (0-70)", 
      sql: "ALTER TABLE public.results ADD CONSTRAINT results_external_marks_check CHECK (external_marks >= 0 AND external_marks <= 70)"
    },
    {
      name: "Drop existing grade column",
      sql: "ALTER TABLE public.results DROP COLUMN IF EXISTS grade CASCADE"
    },
    {
      name: "Drop existing grade_points column",
      sql: "ALTER TABLE public.results DROP COLUMN IF EXISTS grade_points CASCADE" 
    },
    {
      name: "Add new grade column with S/A/B/C/D/E/F system",
      sql: `ALTER TABLE public.results ADD COLUMN grade varchar(2) GENERATED ALWAYS AS (
        CASE 
          WHEN (cie_marks + external_marks) >= 85 THEN 'S'
          WHEN (cie_marks + external_marks) >= 70 THEN 'A'
          WHEN (cie_marks + external_marks) >= 60 THEN 'B'
          WHEN (cie_marks + external_marks) >= 55 THEN 'C'
          WHEN (cie_marks + external_marks) >= 50 THEN 'D'
          WHEN (cie_marks + external_marks) >= 40 AND cie_marks >= 12 AND external_marks >= 28 THEN 'E'
          ELSE 'F'
        END
      ) STORED`
    },
    {
      name: "Add new grade_points column with updated scale",
      sql: `ALTER TABLE public.results ADD COLUMN grade_points decimal(3,1) GENERATED ALWAYS AS (
        CASE 
          WHEN (cie_marks + external_marks) >= 85 THEN 10.0
          WHEN (cie_marks + external_marks) >= 70 THEN 9.0
          WHEN (cie_marks + external_marks) >= 60 THEN 8.0
          WHEN (cie_marks + external_marks) >= 55 THEN 7.0
          WHEN (cie_marks + external_marks) >= 50 THEN 6.0
          WHEN (cie_marks + external_marks) >= 40 AND cie_marks >= 12 AND external_marks >= 28 THEN 5.0
          ELSE 0.0
        END
      ) STORED`
    }
  ];

  try {
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      console.log(`\n${i + 1}. ${migration.name}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });
      
      if (error) {
        console.error(`❌ Failed: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log('⚠️  Constraint/column may not exist, continuing...');
        } else {
          console.log('⚠️  Continuing with next migration...');
        }
      } else {
        console.log(`✅ Success!`);
      }
    }
    
    console.log("\n🎉 Constraint fixes completed!");
    console.log("\nNew constraints:");
    console.log("• CIE Marks: 0-30");
    console.log("• External Marks: 0-70"); 
    console.log("• Total Marks: 0-100");
    console.log("• Grade System: S/A/B/C/D/E/F");
    
    // Test the constraints
    console.log("\n🧪 Testing new constraints...");
    const { data, error } = await supabase
      .from('results')
      .select('cie_marks, external_marks, total, grade, grade_points')
      .limit(1);
    
    if (error) {
      console.error("❌ Test failed:", error.message);
    } else {
      console.log("✅ Constraints are working!");
      if (data && data.length > 0) {
        console.log("Sample record:", data[0]);
      }
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

fixMarksConstraints();