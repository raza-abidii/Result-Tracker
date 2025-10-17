// Test Supabase connection
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qasnikafkrssgamkisjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhc25pa2Fma3Jzc2dhbWtpc2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjYyMTksImV4cCI6MjA3NTYwMjIxOX0.gQUoLJ0q5btSGQTg2sFQcSXTGFgMufrd59GckUdyIwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test the connection
async function testConnection() {
  console.log("Testing Supabase connection...");
  
  try {
    // Test 1: Check if we can connect
    const { data, error } = await supabase.from('results').select('count(*)', { count: 'exact' });
    
    if (error) {
      console.error("❌ Database connection error:", error.message);
      
      if (error.message.includes("relation \"public.results\" does not exist")) {
        console.log("🚨 The 'results' table doesn't exist!");
        console.log("👉 You need to run the SQL migration in Supabase SQL Editor");
      }
    } else {
      console.log("✅ Database connection successful!");
      console.log("📊 Results table exists and has", data[0].count, "records");
    }
    
    // Test 2: Check authentication
    console.log("\nTesting authentication...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("❌ Auth error:", authError.message);
    } else {
      console.log("✅ Auth system working, current user:", user ? user.email : "No user logged in");
    }
    
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
}

testConnection();