/* Minimal browser sync helpers for the static site
 * Exposes `siteSync.signupAndCreateUser(username,password,role,preferredDoctor)`
 * and basic helpers `createMedication` and `logMedEvent` using window.supabaseClient.
 */
// Diagnostic: indicate the file was requested
console.log('site-sync.js: loading');
(function(){
  try {
    if (!window) return;
    const ns = {};

  function ensureClient(){
    if (!window.supabaseClient) throw new Error('Supabase client not initialized. Include supabase-init.js');
    return window.supabaseClient;
  }

  /**
   * Create an auth user (email synthesized from username) and upsert into `users` table.
   */
  ns.signupAndCreateUser = async function(username, password, role, preferredDoctor) {
    const supabase = ensureClient();
    const email = `${username}@local.example`;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username, role } } });
      if (authError) {
        console.warn('Supabase auth.signUp error', authError);
      }

      const userId = authData?.user?.id || null;

      // Upsert into users table so records appear in Supabase DB
      const payload = {
        user_key: userId || null,
        email: email,
        display_name: username,
        first_name: null,
        last_name: null,
        role: role,
        preferred_doctor: preferredDoctor || null,
        approved: role === 'doctor',
        created_at: new Date().toISOString(),
      };

      try {
        // If user_key is null (no user created due to confirmation flow), insert anyway using email
        const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'email' }).select().single();
        if (error) console.error('upsert users error', error);
        return { auth: authData, db: data };
      } catch (e) {
        console.error('users upsert exception', e);
        return { auth: authData };
      }
    } catch (err) {
      console.error('signupAndCreateUser exception', err);
      throw err;
    }
  };

  ns.createMedication = async function(user_key, medPayload) {
    const supabase = ensureClient();
    try {
      const body = Object.assign({}, medPayload, { user_key });
      const { data, error } = await supabase.from('medications').insert(body).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('createMedication error', e);
      throw e;
    }
  };

  /**
   * Create a medication for a patient identified by username (display_name) or email.
   * Uses `window.supabaseService` (service role) when available to bypass RLS for quick dev.
   */
  ns.createMedicationForPatient = async function(patientUsername, medPayload = {}) {
    const svc = window.supabaseService || window.supabaseClient;
    if (!svc) throw new Error('Supabase client not initialized');

    const email = `${patientUsername}@local.example`;
    try {
      let { data: userRow, error: userErr } = await svc
        .from('users')
        .select('user_key,email,display_name')
        .or(`display_name.eq.${patientUsername},email.eq.${email}`)
        .limit(1)
        .maybeSingle();

      if (userErr) {
        console.warn('User lookup error for', patientUsername, userErr.message || userErr);
      }

      if (!userRow) {
        throw new Error(`User not found for '${patientUsername}'`);
      }

      const user_key = userRow.user_key;

      // Map incoming payload to actual medications table columns
      const body = {
        user_key,
        medication_key: medPayload.medication_key || (crypto && crypto.randomUUID ? crypto.randomUUID() : null),
        drug_name: medPayload.drug_name || medPayload.name || null,
        strength: medPayload.strength || medPayload.dose || null,
        route: medPayload.route || null,
        instruction: medPayload.instruction || medPayload.instructions || null,
        frequency_text: medPayload.frequency_text || medPayload.frequency || null,
        qty_text: medPayload.qty_text || medPayload.qty || null,
        refills_text: medPayload.refills_text || medPayload.refills || null,
        is_active: typeof medPayload.is_active === 'boolean' ? medPayload.is_active : true,
      };

      try {
        const { data, error } = await svc.from('medications').insert(body).select().single();
        if (error) throw error;
        console.log('createMedicationForPatient: inserted', data);
        return data;
      } catch (insertErr) {
        console.error('medications insert failed', insertErr);
        throw insertErr;
      }
    } catch (e) {
      console.error('createMedicationForPatient error', e);
      throw e;
    }
  };

  ns.logMedEvent = async function(user_key, payload) {
    const supabase = ensureClient();
    try {
      const body = Object.assign({}, payload, { user_key });
      const { data, error } = await supabase.from('med_events').insert(body).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('logMedEvent error', e);
      throw e;
    }
  };

    window.siteSync = ns;
  } catch (err) {
    console.error('site-sync.js: execution error', err);
  }
})();
