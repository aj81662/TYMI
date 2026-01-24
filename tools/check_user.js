const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxucfwshtvskoqvisbeu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const email = 'aishahsjaffery@tamu.edu';
  console.log('Checking public `users` table for email:', email);
  try {
    const { data: users, error: usersError } = await supabase.from('users').select('*').eq('email', email);
    if (usersError) {
      console.error('Error querying users table:', usersError);
    } else {
      console.log('users result:', users);
    }

    if (users && users.length > 0) {
      const userKey = users[0].user_key || users[0].id || null;
      console.log('Derived user_key:', userKey);
      if (userKey) {
        const { data: meds, error: medsError } = await supabase.from('medications').select('*').eq('user_key', userKey);
        if (medsError) console.error('Error querying medications:', medsError);
        else console.log('medications for user_key:', meds);
      }
    } else {
      console.log('No rows found in public `users` table for that email.');
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
})();
