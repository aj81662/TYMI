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
  ns.createMedicationForPatient = async function(patientIdentifier, medPayload = {}) {
    const svc = window.supabaseService || window.supabaseClient;
    if (!svc) throw new Error('Supabase client not initialized');

    const id = String(patientIdentifier || '').trim();
    if (!id) throw new Error('Patient identifier is required');
    const looksLikeUserKey = id.indexOf('-') > -1 && id.length > 20;
    const email = `${id}@local.example`;
    try {
      let userRow = null;
      let userErr = null;
      if (looksLikeUserKey) {
        ({ data: userRow, error: userErr } = await svc
          .from('users')
          .select('user_key,email,display_name')
          .eq('user_key', id)
          .limit(1)
          .maybeSingle());
      } else {
        ({ data: userRow, error: userErr } = await svc
          .from('users')
          .select('user_key,email,display_name')
          .or(`display_name.eq.${id},email.eq.${email}`)
          .limit(1)
          .maybeSingle());
      }

      if (userErr) {
        console.warn('User lookup error for', id, userErr.message || userErr);
      }

      if (!userRow) {
        throw new Error(`User not found for '${id}'`);
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

  ns.updateMedicationForPatient = async function(patientIdentifier, medicationIdentifier, updates = {}) {
    const svc = window.supabaseService || window.supabaseClient;
    if (!svc) throw new Error('Supabase client not initialized');
    const pid = String(patientIdentifier || '').trim();
    const mid = String(medicationIdentifier || '').trim();
    if (!pid) throw new Error('Patient identifier is required');
    if (!mid) throw new Error('Medication identifier is required');

    const looksLikeUserKey = pid.indexOf('-') > -1 && pid.length > 20;
    const patientEmail = `${pid}@local.example`;
    let userRow = null;
    if (looksLikeUserKey) {
      const { data, error } = await svc.from('users').select('user_key').eq('user_key', pid).limit(1).maybeSingle();
      if (error) throw error;
      userRow = data;
    } else {
      const { data, error } = await svc
        .from('users')
        .select('user_key,email,display_name')
        .or(`display_name.eq.${pid},email.eq.${patientEmail}`)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      userRow = data;
    }
    if (!userRow?.user_key) throw new Error(`User not found for '${pid}'`);

    const body = {};
    if (updates.name != null || updates.drug_name != null) body.drug_name = updates.drug_name || updates.name;
    if (updates.dosage != null || updates.strength != null) body.strength = updates.strength || updates.dosage;
    if (updates.type != null || updates.route != null) body.route = updates.route || updates.type;
    if (updates.instructions != null || updates.instruction != null) body.instruction = updates.instruction || updates.instructions;
    if (updates.schedule != null || updates.frequency_text != null) body.frequency_text = updates.frequency_text || updates.schedule;
    body.updated_at = new Date().toISOString();

    let { data, error } = await svc
      .from('medications')
      .update(body)
      .eq('user_key', userRow.user_key)
      .eq('medication_key', mid)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const dbIdMatch = String(mid).match(/^db-(\d+)$/) || String(mid).match(/^(\d+)$/);
      if (dbIdMatch) {
        ({ data, error } = await svc
          .from('medications')
          .update(body)
          .eq('user_key', userRow.user_key)
          .eq('id', Number(dbIdMatch[1]))
          .select()
          .maybeSingle());
        if (error) throw error;
      }
    }
    if (!data && updates && updates.match) {
      const norm = (v) => String(v || '').trim().toLowerCase();
      const mName = norm(updates.match.name);
      const mDose = norm(updates.match.dosage);
      const mFreq = norm(updates.match.schedule);
      const mInstr = norm(updates.match.instructions);
      const { data: rows, error: rowsErr } = await svc
        .from('medications')
        .select('id,medication_key,drug_name,strength,frequency_text,instruction,created_at')
        .eq('user_key', userRow.user_key)
        .order('created_at', { ascending: false })
        .limit(200);
      if (rowsErr) throw rowsErr;
      const matchRow = (rows || []).find(r =>
        norm(r.drug_name) === mName &&
        (!mDose || norm(r.strength) === mDose) &&
        (!mFreq || norm(r.frequency_text) === mFreq) &&
        (!mInstr || norm(r.instruction) === mInstr)
      ) || (rows || []).find(r => norm(r.drug_name) === mName);
      if (matchRow?.id) {
        ({ data, error } = await svc
          .from('medications')
          .update(body)
          .eq('user_key', userRow.user_key)
          .eq('id', matchRow.id)
          .select()
          .maybeSingle());
        if (error) throw error;
      }
    }
    if (!data) {
      // Legacy local-only medication: create a DB row so future edits/deletes stay in sync.
      const createPayload = {
        medication_key: mid,
        drug_name: body.drug_name || updates.name || updates.drug_name || null,
        strength: body.strength || updates.dosage || updates.strength || null,
        route: body.route || updates.type || updates.route || null,
        instruction: body.instruction || updates.instructions || updates.instruction || null,
        frequency_text: body.frequency_text || updates.schedule || updates.frequency_text || null,
        is_active: true,
        added_by_role: 'doctor',
        added_by_user_key: null
      };
      ({ data, error } = await svc
        .from('medications')
        .insert(Object.assign({ user_key: userRow.user_key }, createPayload))
        .select()
        .maybeSingle());
      if (error) throw error;
    }
    if (!data) throw new Error('Medication not found in database for update');
    return data;
  };

  ns.deleteMedicationForPatient = async function(patientIdentifier, medicationIdentifier) {
    const svc = window.supabaseService || window.supabaseClient;
    if (!svc) throw new Error('Supabase client not initialized');
    const pid = String(patientIdentifier || '').trim();
    const mid = String(medicationIdentifier || '').trim();
    if (!pid) throw new Error('Patient identifier is required');
    if (!mid) throw new Error('Medication identifier is required');

    const looksLikeUserKey = pid.indexOf('-') > -1 && pid.length > 20;
    const patientEmail = `${pid}@local.example`;
    let userRow = null;
    if (looksLikeUserKey) {
      const { data, error } = await svc.from('users').select('user_key').eq('user_key', pid).limit(1).maybeSingle();
      if (error) throw error;
      userRow = data;
    } else {
      const { data, error } = await svc
        .from('users')
        .select('user_key,email,display_name')
        .or(`display_name.eq.${pid},email.eq.${patientEmail}`)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      userRow = data;
    }
    if (!userRow?.user_key) throw new Error(`User not found for '${pid}'`);

    const { data, error } = await svc
      .from('medications')
      .delete()
      .eq('user_key', userRow.user_key)
      .eq('medication_key', mid)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Medication not found in database for delete');
    return data;
  };

  ns.resolveMedicationKeyForPatient = async function(patientIdentifier, medHint = {}) {
    const svc = window.supabaseService || window.supabaseClient;
    if (!svc) throw new Error('Supabase client not initialized');
    const pid = String(patientIdentifier || '').trim();
    if (!pid) throw new Error('Patient identifier is required');

    const looksLikeUserKey = pid.indexOf('-') > -1 && pid.length > 20;
    const patientEmail = `${pid}@local.example`;
    let userRow = null;
    if (looksLikeUserKey) {
      const { data, error } = await svc.from('users').select('user_key').eq('user_key', pid).limit(1).maybeSingle();
      if (error) throw error;
      userRow = data;
    } else {
      const { data, error } = await svc
        .from('users')
        .select('user_key,email,display_name')
        .or(`display_name.eq.${pid},email.eq.${patientEmail}`)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      userRow = data;
    }
    if (!userRow?.user_key) throw new Error(`User not found for '${pid}'`);

    const { data: rows, error: qErr } = await svc
      .from('medications')
      .select('medication_key,drug_name,strength,frequency_text,instruction,created_at')
      .eq('user_key', userRow.user_key)
      .order('created_at', { ascending: false })
      .limit(200);
    if (qErr) throw qErr;
    if (!rows || rows.length === 0) return null;

    const norm = (v) => String(v || '').trim().toLowerCase();
    const nName = norm(medHint.name);
    const nDose = norm(medHint.dosage);
    const nFreq = norm(medHint.schedule);
    const nInstr = norm(medHint.instructions);

    const exact = rows.find(r =>
      norm(r.drug_name) === nName &&
      (!nDose || norm(r.strength) === nDose) &&
      (!nFreq || norm(r.frequency_text) === nFreq) &&
      (!nInstr || norm(r.instruction) === nInstr)
    );
    if (exact?.medication_key) return exact.medication_key;

    const byName = rows.find(r => norm(r.drug_name) === nName && r.medication_key);
    if (byName?.medication_key) return byName.medication_key;

    return rows[0]?.medication_key || null;
  };

    window.siteSync = ns;
  } catch (err) {
    console.error('site-sync.js: execution error', err);
  }
})();
