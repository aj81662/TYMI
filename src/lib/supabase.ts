import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase.types';

const SUPABASE_URL = 'https://sxucfwshtvskoqvisbeu.supabase.co';
// Prefer injecting the key via environment for build/runtime tooling.
// Falls back to the public anon key from the handoff (safe for frontend use).
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export default supabase;
