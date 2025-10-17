import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-project-url';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  // Check if the results table exists and get its structure
  const { data, error } = await supabase.from('results').select('*').limit(1);
  
  if (error) {
    console.log('Current results table structure or error:', error);
  } else {
    console.log('Current results table sample data:', data);
  }
  
  // Check if we can access the table structure
  const { data: schema, error: schemaError } = await supabase
    .rpc('get_table_schema', { table_name: 'results' })
    .single();
    
  if (schemaError) {
    console.log('Cannot get schema info:', schemaError);
  } else {
    console.log('Table schema:', schema);
  }
}

checkSchema();