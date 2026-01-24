const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxucfwshtvskoqvisbeu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const userKey = 'aishahsjaffery@tamu.edu';
  console.log('Inserting medication for user_key:', userKey);

  try {
    const payload = {
      user_key: userKey,
      medication_key: `med_${Date.now()}`,
      drug_name: 'AssistantTestDrug',
      strength: '10mg',
      instruction: 'Take once daily',
      frequency_text: 'daily',
      qty_text: '30',
      refills_text: '2',
      is_active: true,
    };

    const { data, error } = await supabase.from('medications').insert(payload).select().single();
    if (error) {
      console.error('Insert error:', error);
      return;
    }
    console.log('Inserted medication:', data);
  } catch (e) {
    console.error('Unexpected error:', e);
  }
})();
