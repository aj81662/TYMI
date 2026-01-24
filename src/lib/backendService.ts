import { supabase } from './supabase';
import type {
  SignupRequest,
  UserResponse,
  UserProfile,
  MedicationCreate,
  BackendMedication,
  MedEventCreate,
  MedEvent,
} from './supabase.types';

function generateMedicationKey(): string {
  return `med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session;
}

export async function signupUser(request: SignupRequest): Promise<UserResponse> {
  if (!request.email || !request.password) {
    throw new Error('Email and password are required');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: request.email,
    password: request.password,
    options: {
      data: {
        display_name: request.display_name,
        first_name: request.first_name,
        last_name: request.last_name,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message || 'Signup failed');
  }

  if (!authData.user) {
    throw new Error('Signup failed - no user returned');
  }

  const userKey = authData.user.id;

  const { data } = await supabase
    .from('users')
    .insert({
      user_key: userKey,
      email: request.email,
      display_name: request.display_name,
      first_name: request.first_name,
      last_name: request.last_name,
    })
    .select()
    .single();

  return {
    id: data?.id || 0,
    user_key: userKey,
    email: request.email,
    display_name: request.display_name,
    first_name: request.first_name,
    last_name: request.last_name,
    created_at: authData.user.created_at,
  } as UserResponse;
}

export async function loginUser(email: string, password: string): Promise<UserResponse> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    throw new Error(authError.message || 'Invalid email or password');
  }
  if (!authData.user) throw new Error('Login failed - no user returned');

  const userKey = authData.user.id;

  let { data: userData, error: userError } = await supabase.from('users').select('*').eq('user_key', userKey).single();

  if (userError) {
    try {
      const { data: newUser } = await supabase.from('users').insert({
        user_key: userKey,
        email: authData.user.email,
        display_name: (authData.user.user_metadata as any)?.display_name,
        first_name: (authData.user.user_metadata as any)?.first_name,
        last_name: (authData.user.user_metadata as any)?.last_name,
      }).select().single();
      userData = newUser as any;
    } catch (e) {
      // ignore
    }
  }

  return {
    id: (userData as any)?.id || 0,
    user_key: userKey,
    email: authData.user.email,
    display_name: (userData as any)?.display_name || (authData.user.user_metadata as any)?.display_name,
    first_name: (userData as any)?.first_name || (authData.user.user_metadata as any)?.first_name,
    last_name: (userData as any)?.last_name || (authData.user.user_metadata as any)?.last_name,
    created_at: authData.user.created_at,
    updated_at: (userData as any)?.updated_at,
  } as UserResponse;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function updateUserProfile(payload: Partial<UserProfile> & { user_key: string }): Promise<UserProfile> {
  const { error: userError } = await supabase.from('users').update({
    email: payload.email,
    display_name: payload.display_name,
    first_name: payload.first_name,
    last_name: payload.last_name,
    updated_at: new Date().toISOString(),
  }).eq('user_key', payload.user_key);

  if (userError) throw new Error(userError.message);

  const { data, error } = await supabase.from('user_profiles').upsert({
    user_key: payload.user_key,
    nickname: payload.nickname,
    age: payload.age,
    gender: payload.gender,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_key' }).select().single();

  if (error) throw new Error(error.message);
  return data as UserProfile;
}

export async function fetchUserProfile(user_key: string): Promise<UserProfile> {
  const { data: userData, error: userError } = await supabase.from('users').select('*').eq('user_key', user_key).single();
  if (userError) throw new Error(userError.message);

  const { data: profileData } = await supabase.from('user_profiles').select('*').eq('user_key', user_key).single();

  const result: UserProfile = {
    id: (userData as any).id,
    user_key: (userData as any).user_key,
    email: (userData as any).email ?? undefined,
    display_name: (userData as any).display_name ?? undefined,
    first_name: (userData as any).first_name ?? undefined,
    last_name: (userData as any).last_name ?? undefined,
    nickname: (profileData as any)?.nickname ?? undefined,
    age: (profileData as any)?.age ?? undefined,
    gender: (profileData as any)?.gender ?? undefined,
    created_at: (userData as any).created_at ?? undefined,
    updated_at: (userData as any).updated_at ?? undefined,
  };

  return result;
}

export async function fetchMedications(user_key: string): Promise<BackendMedication[]> {
  const { data, error } = await supabase.from('medications').select('*').eq('user_key', user_key).eq('is_active', true).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as BackendMedication[];
}

export async function createMedication(payload: MedicationCreate): Promise<BackendMedication> {
  const { data: { session } } = await supabase.auth.getSession();
  const medicationKey = payload.medication_key || generateMedicationKey();
  const { data, error } = await supabase.from('medications').insert({
    user_key: payload.user_key,
    medication_key: medicationKey,
    drug_name: payload.drug_name,
    strength: payload.strength,
    route: payload.route,
    instruction: payload.instruction,
    frequency_text: payload.frequency_text,
    qty_text: payload.qty_text,
    refills_text: payload.refills_text,
    is_active: true,
  }).select().single();
  if (error) throw new Error(error.message);
  return data as BackendMedication;
}

export async function updateMedication(payload: MedicationCreate & { id?: number | string }): Promise<BackendMedication> {
  if (!payload.id && !payload.medication_key) return createMedication(payload);

  const updateData: any = {
    drug_name: payload.drug_name,
    strength: payload.strength,
    route: payload.route,
    instruction: payload.instruction,
    frequency_text: payload.frequency_text,
    qty_text: payload.qty_text,
    refills_text: payload.refills_text,
    updated_at: new Date().toISOString(),
  };

  let query: any = supabase.from('medications').update(updateData);
  if (payload.id && typeof payload.id === 'number') query = query.eq('id', payload.id);
  else if (payload.medication_key) query = query.eq('medication_key', payload.medication_key);
  else if (payload.id) query = query.eq('medication_key', String(payload.id));

  const { data, error } = await query.select().single();
  if (error) return createMedication(payload);
  return data as BackendMedication;
}

export async function deleteMedication(idOrKey: string | number): Promise<void> {
  let query: any = supabase.from('medications').update({ is_active: false, updated_at: new Date().toISOString() });
  if (typeof idOrKey === 'number') query = query.eq('id', idOrKey);
  else if (!isNaN(Number(idOrKey))) query = query.eq('id', Number(idOrKey));
  else query = query.eq('medication_key', idOrKey);

  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function fetchMedEvents(user_key: string): Promise<MedEvent[]> {
  const { data, error } = await supabase.from('med_events').select('*').eq('user_key', user_key).order('event_time', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as MedEvent[];
}

export async function logMedEvent(payload: MedEventCreate): Promise<MedEvent> {
  let medicationId: any = payload.medication_id;
  if (typeof medicationId === 'string') {
    if (!isNaN(Number(medicationId))) medicationId = Number(medicationId);
    else {
      const { data: med } = await supabase.from('medications').select('id').eq('medication_key', medicationId).single();
      if (med) medicationId = (med as any).id;
      else throw new Error(`Medication not found: ${payload.medication_id}`);
    }
  }

  const { data, error } = await supabase.from('med_events').insert({
    user_key: payload.user_key,
    medication_id: medicationId,
    event_time: payload.event_time || new Date().toISOString(),
    event_type: payload.event_type,
    source: payload.source,
    metadata: payload.metadata,
  }).select().single();

  if (error) throw new Error(error.message);
  return data as MedEvent;
}

export function subscribeMedications(user_key: string, callback: (payload: any) => void) {
  return supabase.channel(`medications:${user_key}`).on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'medications',
    filter: `user_key=eq.${user_key}`,
  }, callback).subscribe();
}

export function subscribeMedEvents(user_key: string, callback: (payload: any) => void) {
  return supabase.channel(`med_events:${user_key}`).on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'med_events',
    filter: `user_key=eq.${user_key}`,
  }, callback).subscribe();
}

export async function healthCheck(): Promise<{ status: string; supabase: boolean }> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return { status: 'healthy', supabase: !error };
  } catch {
    return { status: 'unhealthy', supabase: false };
  }
}

export default {
  getCurrentUserId,
  getSession,
  signupUser,
  loginUser,
  signOutUser,
  updateUserProfile,
  fetchUserProfile,
  fetchMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  fetchMedEvents,
  logMedEvent,
  subscribeMedications,
  subscribeMedEvents,
  healthCheck,
};
