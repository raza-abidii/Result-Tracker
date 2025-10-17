// Complete Database Setup Script
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://qasnikafkrssgamkisjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhc25pa2Fma3Jzc2dhbWtpc2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjYyMTksImV4cCI6MjA3NTYwMjIxOX0.gQUoLJ0q5btSGQTg2sFQcSXTGFgMufrd59GckUdyIwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupDatabase() {
  console.log("🚀 Setting up database from scratch...");
  
  try {
    // Read the complete setup SQL file
    const sqlContent = fs.readFileSync('./complete-database-setup.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('NOTIFY') || statement.startsWith('--') || statement.length < 10) {
        console.log(`⏭️  Skipping statement ${i + 1}: Comment or short statement`);
        continue;
      }
      
      console.log(`📋 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 80)}...`);
      
      // For Supabase, we need to use the REST API for DDL operations
      const { data, error } = await supabase.rpc('exec', { sql: statement + ';' });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error(`Statement was: ${statement}`);
        // Continue with other statements for non-critical errors
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`⚠️  Non-critical error, continuing...`);
        } else {
          console.log(`🛑 Critical error, stopping execution`);
          break;
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log("\n🎉 Database setup completed!");
    
    // Test the new schema
    console.log("\n🧪 Testing new schema...");
    const { data, error } = await supabase
      .from('results')
      .select('hall_ticket, semester, credits, grade_points, is_backlog, academic_year, department')
      .limit(3);
    
    if (error) {
      console.error("❌ Schema test failed:", error.message);
    } else {
      console.log("✅ New schema is working!");
      console.log("📊 Sample data structure:", JSON.stringify(data, null, 2));
    }
    
    // Test the views
    console.log("\n🔍 Testing SGPA view...");
    const { data: sgpaData, error: sgpaError } = await supabase
      .from('student_sgpa')
      .select('*')
      .limit(1);
    
    if (sgpaError) {
      console.error("❌ SGPA view test failed:", sgpaError.message);
    } else {
      console.log("✅ SGPA view is working!");
      console.log("📈 SGPA data:", JSON.stringify(sgpaData, null, 2));
    }
    
  } catch (error) {
    console.error("💥 Database setup failed:", error.message);
  }
}

setupDatabase();