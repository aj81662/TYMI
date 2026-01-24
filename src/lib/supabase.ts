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

// Expose for quick dev inspection in the browser console only
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore - attach for debugging only
  (window as any).supabase = supabase;
}

export default supabase;
