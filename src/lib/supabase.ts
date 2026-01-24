import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase.types';

const SUPABASE_URL = 'https://sxucfwshtvskoqvisbeu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export default supabase;
