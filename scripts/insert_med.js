#!/usr/bin/env node
(async function(){
  const fs = require('fs');
  const path = require('path');

  const envPath = path.resolve(__dirname, '..', 'env.json');
  if (!fs.existsSync(envPath)) {
    console.error('env.json not found at', envPath);
    process.exit(1);
  }

  const env = JSON.parse(fs.readFileSync(envPath, 'utf8'));
  const SUPABASE_URL = env.SUPABASE_URL || env.supabaseUrl;
  const SVC = env.SUPABASE_SERVICE_ROLE || env.supabaseServiceKey || env.supabase_service_role;

  if (!SUPABASE_URL || !SVC) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in env.json');
    process.exit(1);
  }

  // Customize these values as needed
  const USER_KEY = process.argv[2] || 'patient1-key-0001';
  const DRUG_NAME = process.argv[3] || 'Lisinopril';
  const STRENGTH = process.argv[4] || '10 mg';

  const medKey = 'med_' + Date.now() + '_' + Math.random().toString(36).slice(2,9);
  const payload = [{
    user_key: USER_KEY,
    medication_key: medKey,
    drug_name: DRUG_NAME,
    strength: STRENGTH,
    instruction: 'Once daily',
    frequency_text: 'Daily',
    qty_text: '30',
    refills_text: '2',
    is_active: true
  }];

  try {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/medications`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SVC,
        'Authorization': `Bearer ${SVC}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('Insert failed', res.status, res.statusText, json);
      process.exit(2);
    }

    console.log('Inserted medication:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Exception inserting medication:', err);
    process.exit(3);
  }
})();
