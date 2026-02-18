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
      let authData = null;
      let authError = null;
      ({ data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username, role } } }));

      // Recover from "already registered" by signing in and continuing with DB upsert.
      if (authError && String(authError.message || '').toLowerCase().includes('already registered')) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr || !signInData?.user?.id) {
          throw new Error('Username already exists. Use login or reset the password.');
        }
        authData = { user: signInData.user };
        authError = null;
      }

      if (authError) throw authError;

      const userId = authData?.user?.id || null;
      if (!userId) throw new Error('Signup did not return a user id');
      let preferredDoctorUserKey = null;
      if (role === 'patient') {
        if (!preferredDoctor) {
          throw new Error('Patient accounts must choose a doctor.');
        }
        // If dropdown provided a user_key directly, trust it.
        if (typeof preferredDoctor === 'string' && preferredDoctor.length > 20 && preferredDoctor.indexOf('-') > -1) {
          preferredDoctorUserKey = preferredDoctor;
        } else {
          const preferredDoctorEmail = `${preferredDoctor}@local.example`;
          let docRow = null;
          let docErr = null;
          ({ data: docRow, error: docErr } = await supabase
            .from('users')
            .select('user_key')
            .or(`display_name.eq.${preferredDoctor},email.eq.${preferredDoctorEmail}`)
            .limit(1)
            .maybeSingle());
          if (!docErr && docRow?.user_key) {
            preferredDoctorUserKey = docRow.user_key;
          } else {
            // Fallback: doctor may exist only in `public.doctors`.
            let doctorRow = null;
            let doctorErr = null;
            ({ data: doctorRow, error: doctorErr } = await supabase
              .from('doctors')
              .select('user_key,display_name,email')
              .or(`display_name.eq.${preferredDoctor},email.eq.${preferredDoctorEmail}`)
              .limit(1)
              .maybeSingle());
            if (doctorErr) throw doctorErr;
            preferredDoctorUserKey = doctorRow?.user_key || null;
          }
        }
        if (!preferredDoctorUserKey) {
          throw new Error('Selected doctor was not found in database. Please create/login doctor first.');
        }
      }

      // Base payload (always valid on minimal schema).
      const basePayload = {
        user_key: userId,
        email: email,
        display_name: username,
        first_name: null,
        last_name: null,
        updated_at: new Date().toISOString(),
      };

      try {
        // First try richer payload for role-based workflows.
        const richPayload = Object.assign({}, basePayload, {
          role: role,
          account_status: role === 'doctor' ? 'approved' : 'pending',
          preferred_doctor_user_key: role === 'patient' ? preferredDoctorUserKey : null,
        });
        let data = null;
        let error = null;
        ({ data, error } = await supabase.from('users').upsert(richPayload, { onConflict: 'user_key' }).select().single());
        if (error) {
          if (role === 'patient' && preferredDoctorUserKey) {
            throw new Error('Database is missing preferred_doctor_user_key support. Run schema migration for doctor linkage.');
          }
          // Fallback for schemas that don't yet have role/account_status.
          ({ data, error } = await supabase.from('users').upsert(basePayload, { onConflict: 'user_key' }).select().single());
        }
        if (error) throw error;

        // Keep doctors table in sync for dropdowns/assignment flows.
        // This is best-effort because some projects keep strict RLS on `doctors`.
        let doctorSynced = role !== 'doctor';
        if (role === 'doctor') {
          const { error: doctorErr } = await supabase.from('doctors').upsert({
            user_key: userId,
            display_name: username,
            email,
          }, { onConflict: 'user_key' });
          if (doctorErr) {
            console.warn('doctors upsert skipped:', doctorErr.message || doctorErr);
            doctorSynced = false;
          } else {
            doctorSynced = true;
          }
        }

        return { auth: authData, db: data, doctorSynced };
      } catch (e) {
        console.error('users upsert exception', e);
        throw e;
      }
    } catch (err) {
      console.error('signupAndCreateUser exception', err);
      throw err;
    }
  };

  ns.createMedication = async function(user_key, medPayload) {
    const supabase = ensureClient();
    try {
      // Set audit fields for who added the medication
      let added_by_role = medPayload.added_by_role || 'patient';
      let added_by_user_key = medPayload.added_by_user_key || null;
      try {
        if (!added_by_user_key && window.supabaseClient?.auth) {
          const s = await window.supabaseClient.auth.getUser();
          added_by_user_key = s?.data?.user?.id || added_by_user_key;
        }
      } catch (e) {}

      const body = Object.assign({}, medPayload, { user_key, added_by_role, added_by_user_key });
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
      // Normalize incoming payloads: support multiple field names used across
      // website variants (dose/dosage, name/label_name, instructions/instruction, etc.)
      const medicationKey = medPayload.medication_key || medPayload.med_key || medPayload.id || null;
      const generatedKey = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `med_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

      // Determine who is adding this medication (doctor portal)
      let added_by_role = medPayload.added_by_role || 'doctor';
      let added_by_user_key = medPayload.added_by_user_key || null;
      try {
        if (!added_by_user_key && window.supabaseClient?.auth) {
          const s = await window.supabaseClient.auth.getUser();
          added_by_user_key = s?.data?.user?.id || added_by_user_key;
        }
      } catch (e) {}

      const body = {
        user_key,
        medication_key: medicationKey || generatedKey,
        label_name: medPayload.label_name || medPayload.name || medPayload.label || null,
        drug_name: medPayload.drug_name || medPayload.name || null,
        // Accept dose, dosage or strength
        strength: medPayload.strength || medPayload.dose || medPayload.dosage || null,
        route: medPayload.route || medPayload.type || null,
        instruction: medPayload.instruction || medPayload.instructions || medPayload.instructions_text || null,
        frequency_text: medPayload.frequency_text || medPayload.frequency || medPayload.schedule || null,
        qty_text: medPayload.qty_text || medPayload.qty || medPayload.quantity || null,
        refills_text: medPayload.refills_text || medPayload.refills || null,
        is_active: typeof medPayload.is_active === 'boolean' ? medPayload.is_active : true,
        added_by_role,
        added_by_user_key,
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
