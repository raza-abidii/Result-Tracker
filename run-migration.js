// Run database migration to add semester and credits columns
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://qasnikafkrssgamkisjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhc25pa2Fma3Jzc2dhbWtpc2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjYyMTksImV4cCI6MjA3NTYwMjIxOX0.gQUoLJ0q5btSGQTg2sFQcSXTGFgMufrd59GckUdyIwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log("Running database migration...");
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./add_semester_columns.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('NOTIFY') || statement.includes('--')) {
        console.log(`Skipping statement ${i + 1}: NOTIFY or comment`);
        continue;
      }
      
      console.log(`Executing statement ${i + 1}...`);
      console.log(`SQL: ${statement.substring(0, 100)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log("Migration completed!");
    
    // Test the new schema
    console.log("\nTesting new schema...");
    const { data, error } = await supabase
      .from('results')
      .select('hall_ticket, semester, credits, grade_points, is_backlog')
      .limit(1);
    
    if (error) {
      console.error("❌ Schema test failed:", error.message);
    } else {
      console.log("✅ New schema is working!");
      console.log("Sample data structure:", data);
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  }
}

runMigration();