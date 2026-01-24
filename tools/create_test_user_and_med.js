const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxucfwshtvskoqvisbeu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const email = 'test1@example.com';
  const password = 'TestPass123!';
  console.log('Creating test account:', email);

  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) {
      console.error('Signup error:', signupError);
    } else {
      console.log('Signup response:', signupData);
    }

    // Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      console.error('Sign-in error:', signInError);
    } else {
      console.log('Sign-in success:', signInData);
    }

    const userId = signInData?.user?.id || signupData?.user?.id;
    if (!userId) {
      console.error('Could not obtain user id from signup/signin responses. The project may require email confirmation.');
      return;
    }

    console.log('User id:', userId);

    // Insert test medication
    const medPayload = {
      user_key: userId,
      medication_key: `dev_med_${Date.now()}`,
      drug_name: 'DevTestDrug',
      is_active: true,
    };

    const { data: medData, error: medError } = await supabase.from('medications').insert(medPayload).select().single();
    if (medError) {
      console.error('Create med error:', medError);
    } else {
      console.log('Created medication:', medData);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
})();
