import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const USER_ID = process.env.USER_ID; // auth.users id
const NEW_PASSWORD = process.env.NEW_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID || !NEW_PASSWORD) {
  console.error('Missing env vars. Set SUPABASE_URL, SERVICE_ROLE_KEY, USER_ID, NEW_PASSWORD');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, { password: NEW_PASSWORD });
    if (error) {
      console.error('Error updating user:', error);
      process.exit(1);
    }
    console.log('User updated:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
