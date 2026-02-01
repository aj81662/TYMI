/**
 * Backend Service
 * 
 * This service uses Supabase Auth for secure authentication (bcrypt password hashing,
 * JWT sessions) and Supabase Database for data storage with real-time sync.
 * 
 * ============================================================================
 * SECURITY MODEL - Row Level Security (RLS)
 * ============================================================================
 * 
 * All user-scoped tables have RLS enabled and enforced:
 * - medications, med_events, user_profiles, user_settings, adherance_logs, audit_log
 * 
 * RLS Policy Pattern:
 * - SELECT:  USING (user_key = auth.uid())
 * - INSERT:  WITH CHECK (user_key = auth.uid())
 * - UPDATE:  USING + WITH CHECK (user_key = auth.uid())
 * - DELETE:  USING (user_key = auth.uid())
 * 
 * Key Security Invariants:
 * 1. The database is the source of truth for authorization, not the client.
 * 2. Client-side .eq('user_key', ...) filters are for performance, not security.
 * 3. RLS ensures users can only access/modify their own data.
 * 4. The user_key passed to inserts MUST equal auth.uid() (enforced by RLS).
 * 5. Empty query results may be due to RLS filtering - not necessarily errors.
 * 6. audit_log is write-only via database triggers (immutable to clients).
 * 7. Realtime subscriptions respect RLS - users only receive their own data.
 * 
 * NEVER trust client-side filtering for security.
 * NEVER allow user_key to be user-editable.
 * ============================================================================
 */

import { supabase } from './supabase';
import { getCurrentUserKey, requireUserKey, isPermissionError, isAuthError } from './AuthService';

// ============================================================================
// TYPES
// ============================================================================

export interface SignupRequest {
  email?: string;
  display_name?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserResponse {
  id: number;
  user_key: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: number;
  user_key: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  age?: number;
  gender?: string;
  email?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Medication creation payload.
 * Note: user_key is NEVER accepted - always derived from session internally.
 */
export interface MedicationCreate {
  // user_key intentionally omitted - derived from session by BackendService
  label_name?: string;
  drug_name?: string;
  strength?: string;
  route?: string;
  instruction?: string;
  frequency_text?: string;
  qty_text?: string;
  refills_text?: string;
  medication_key?: string;
  id?: number | string;
}

export interface BackendMedication {
  id: number;
  user_key: string;
  label_name?: string;
  drug_name?: string;
  strength?: string;
  route?: string;
  instruction?: string;
  frequency_text?: string;
  qty_text?: string;
  refills_text?: string;
  medication_key?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Med event creation payload.
 * Note: user_key is NEVER accepted - always derived from session internally.
 */
export interface MedEventCreate {
  // user_key intentionally omitted - derived from session by BackendService
  medication_id: string | number;
  event_time?: string;
  event_type: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface MedEvent {
  id: number;
  user_key: string;
  medication_id: number;
  event_time: string;
  event_type: string;
  source?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique medication key
 */
function generateMedicationKey(): string {
  return `med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current authenticated user's ID (from Supabase Auth)
 * @deprecated Use getCurrentUserKey() from AuthService instead
 */
export async function getCurrentUserId(): Promise<string | null> {
  return getCurrentUserKey();
}

/**
 * Get current session
 * @deprecated Use getSession() from AuthService instead
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================================================
// AUTH ENDPOINTS (using Supabase Auth - secure bcrypt hashing)
// ============================================================================

export async function signupUser(request: SignupRequest): Promise<UserResponse> {
  console.log('🔐 Supabase Auth signupUser:', { email: request.email });

  if (!request.email || !request.password) {
    throw new Error('Email and password are required');
  }

  // Sign up with Supabase Auth (uses bcrypt for password hashing)
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
    console.error('❌ Supabase Auth signup error:', authError);
    throw new Error(authError.message || 'Signup failed');
  }

  if (!authData.user) {
    throw new Error('Signup failed - no user returned');
  }

  // Check if email confirmation is required
  // If session is null but user exists, email confirmation is needed
  if (!authData.session) {
    console.log('⚠️ Email confirmation may be required - no session returned');
    // Return basic user info - they'll need to confirm email then login
    return {
      id: 0,
      user_key: authData.user.id,
      email: request.email,
      display_name: request.display_name,
      first_name: request.first_name,
      last_name: request.last_name,
      created_at: authData.user.created_at,
    } as UserResponse;
  }

  // Use Auth user ID as user_key for consistency
  const userKey = authData.user.id;
  console.log('✅ Session active, user_key:', userKey);

  // Create corresponding record in our users table
  const { data, error } = await supabase
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

  if (error) {
    console.error('❌ Create user record error:', error);
    // User was created in Auth, so we should still return success
    // The user record will be created on next login if needed
  }

  console.log('✅ User signed up:', userKey);
  
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
  console.log('🔐 Supabase Auth loginUser:', email);

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('❌ Supabase Auth login error:', authError);
    throw new Error(authError.message || 'Invalid email or password');
  }

  if (!authData.user) {
    throw new Error('Login failed - no user returned');
  }

  const userKey = authData.user.id;

  // Fetch or create user record in our users table
  let { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('user_key', userKey)
    .single();

  // If user doesn't exist in our table, create them
  if (userError && userError.code === 'PGRST116') {
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        user_key: userKey,
        email: authData.user.email,
        display_name: authData.user.user_metadata?.display_name,
        first_name: authData.user.user_metadata?.first_name,
        last_name: authData.user.user_metadata?.last_name,
      })
      .select()
      .single();

    if (!createError) {
      userData = newUser;
    }
  }

  console.log('✅ Login successful:', userKey);
  
  return {
    id: userData?.id || 0,
    user_key: userKey,
    email: authData.user.email,
    display_name: userData?.display_name || authData.user.user_metadata?.display_name,
    first_name: userData?.first_name || authData.user.user_metadata?.first_name,
    last_name: userData?.last_name || authData.user.user_metadata?.last_name,
    created_at: authData.user.created_at,
    updated_at: userData?.updated_at,
  } as UserResponse;
}

/**
 * Sign out the current user
 * @deprecated Use AuthService.signOut() instead - it triggers cleanup of 
 * Realtime subscriptions, in-memory state, and cached data via auth state listeners.
 */
export async function signOutUser(): Promise<void> {
  console.log('🔐 Supabase Auth signOut');
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ Sign out error:', error);
    throw new Error(error.message);
  }
  console.log('✅ Signed out');
}

/**
 * Update user profile.
 * user_key is derived from session - never from payload.
 */
export async function updateUserProfile(payload: Partial<UserProfile>): Promise<UserProfile> {
  // ALWAYS get user_key from session
  const userKey = await requireUserKey();
  console.log('📝 Supabase updateUserProfile');

  // Update users table with basic info (RLS ensures we can only update our own)
  const { error: userError } = await supabase
    .from('users')
    .update({
      email: payload.email,
      display_name: payload.display_name,
      first_name: payload.first_name,
      last_name: payload.last_name,
      updated_at: new Date().toISOString(),
    })
    .eq('user_key', userKey);

  if (userError) {
    console.error('❌ Update user error:', userError);
    if (isPermissionError(userError)) {
      throw new Error('Permission denied. Please sign in again.');
    }
    throw new Error(userError.message);
  }

  // Upsert user_profiles for extended info
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_key: userKey,
      nickname: payload.nickname,
      age: payload.age,
      gender: payload.gender,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_key' })
    .select()
    .single();

  if (error) {
    console.error('❌ Update profile error:', error);
    throw new Error(error.message);
  }

  console.log('✅ Profile updated');
  return data as UserProfile;
}

/**
 * Fetch user profile for the current user.
 * RLS ensures users can only see their own profile.
 * user_key is derived from session internally.
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  // Always derive from session
  await requireUserKey(); // Ensure authenticated
  console.log('📖 Supabase fetchUserProfile');

  // Fetch user data (RLS filters automatically)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .single();

  if (userError) {
    console.error('❌ Fetch user error:', userError);
    if (isPermissionError(userError)) {
      throw new Error('Permission denied. Please sign in again.');
    }
    throw new Error(userError.message);
  }

  // Fetch profile data
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('*')
    .single();

  // Combine user and profile data
  const result: UserProfile = {
    id: userData.id,
    user_key: userData.user_key,
    email: userData.email ?? undefined,
    display_name: userData.display_name ?? undefined,
    first_name: userData.first_name ?? undefined,
    last_name: userData.last_name ?? undefined,
    nickname: profileData?.nickname ?? undefined,
    age: profileData?.age ?? undefined,
    gender: profileData?.gender ?? undefined,
    created_at: userData.created_at ?? undefined,
    updated_at: userData.updated_at ?? undefined,
  };

  console.log('✅ Profile fetched');
  return result;
}

// ============================================================================
// MEDICATION ENDPOINTS
// ============================================================================

/**
 * Fetch medications for the current user.
 * With RLS enabled, the database will filter by auth.uid() automatically.
 * No user_key parameter needed - RLS handles filtering.
 */
export async function fetchMedications(): Promise<BackendMedication[]> {
  // Ensure authenticated - RLS will filter by auth.uid()
  await requireUserKey();
  console.log('💊 Supabase fetchMedications');

  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Fetch medications error:', error);
    if (isPermissionError(error)) {
      throw new Error('Permission denied. Please sign in again.');
    }
    throw new Error(error.message);
  }

  // RLS already filters by user - empty results are valid
  console.log(`✅ Fetched ${data?.length || 0} medications`);
  return (data || []) as BackendMedication[];
}

/**
 * Create a new medication.
 * user_key is derived from the session - do not trust client-provided values.
 */
export async function createMedication(payload: MedicationCreate): Promise<BackendMedication> {
  console.log('💊 Supabase createMedication:', payload.drug_name);

  // ALWAYS get user_key from session, never trust payload
  const userKey = await requireUserKey();

  // Generate medication_key if not provided
  const medicationKey = payload.medication_key || generateMedicationKey();

  const { data, error } = await supabase
    .from('medications')
    .insert({
      user_key: userKey, // Always from session, not payload
      medication_key: medicationKey,
      drug_name: payload.drug_name,
      strength: payload.strength,
      route: payload.route,
      instruction: payload.instruction,
      frequency_text: payload.frequency_text,
      qty_text: payload.qty_text,
      refills_text: payload.refills_text,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Create medication error:', error);
    if (isPermissionError(error)) {
      throw new Error('Permission denied. Please sign in again.');
    }
    if (isAuthError(error)) {
      throw new Error('Authentication expired. Please sign in again.');
    }
    throw new Error(error.message);
  }

  console.log('✅ Medication created:', data.id);
  return data as BackendMedication;
}

export async function updateMedication(payload: MedicationCreate & { id?: number | string }): Promise<BackendMedication> {
  console.log('💊 Supabase updateMedication:', payload.id || payload.medication_key);

  // If no id, create new medication
  if (!payload.id && !payload.medication_key) {
    return createMedication(payload);
  }

  // Build update object
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

  // Update by id or medication_key
  let query = supabase.from('medications').update(updateData);
  
  if (payload.id && typeof payload.id === 'number') {
    query = query.eq('id', payload.id);
  } else if (payload.medication_key) {
    query = query.eq('medication_key', payload.medication_key);
  } else if (payload.id) {
    // id might be a string medication_key
    query = query.eq('medication_key', String(payload.id));
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('❌ Update medication error:', error);
    // If update fails, try to create
    return createMedication(payload);
  }

  console.log('✅ Medication updated:', data.id);
  return data as BackendMedication;
}

export async function deleteMedication(idOrKey: string | number): Promise<void> {
  console.log('🗑️ Supabase deleteMedication:', idOrKey);

  // Soft delete by setting is_active = false
  let query = supabase
    .from('medications')
    .update({ is_active: false, updated_at: new Date().toISOString() });

  if (typeof idOrKey === 'number') {
    query = query.eq('id', idOrKey);
  } else if (!isNaN(Number(idOrKey))) {
    query = query.eq('id', Number(idOrKey));
  } else {
    query = query.eq('medication_key', idOrKey);
  }

  const { error } = await query;

  if (error) {
    console.error('❌ Delete medication error:', error);
    throw new Error(error.message);
  }

  console.log('✅ Medication deleted');
}

// ============================================================================
// MEDICATION EVENT ENDPOINTS
// ============================================================================

/**
 * Fetch med events for the current user.
 * RLS ensures users only see their own events.
 * No user_key parameter needed - RLS handles filtering.
 */
export async function fetchMedEvents(): Promise<MedEvent[]> {
  // Ensure authenticated - RLS will filter by auth.uid()
  await requireUserKey();
  console.log('📊 Supabase fetchMedEvents');

  const { data, error } = await supabase
    .from('med_events')
    .select('*')
    .order('event_time', { ascending: false });

  if (error) {
    console.error('❌ Fetch events error:', error);
    if (isPermissionError(error)) {
      throw new Error('Permission denied. Please sign in again.');
    }
    throw new Error(error.message);
  }

  console.log(`✅ Fetched ${data?.length || 0} events`);
  return (data || []) as MedEvent[];
}

/**
 * Log a medication event.
 * user_key is derived from the session - do not trust client-provided values.
 */
export async function logMedEvent(payload: MedEventCreate): Promise<MedEvent> {
  console.log('📊 Supabase logMedEvent:', payload.event_type);

  // ALWAYS get user_key from session, never trust payload
  const userKey = await requireUserKey();

  // Convert medication_id to number if needed
  let medicationId = payload.medication_id;
  if (typeof medicationId === 'string') {
    // Try to parse as number, or look up by medication_key
    if (!isNaN(Number(medicationId))) {
      medicationId = Number(medicationId);
    } else {
      // Look up medication by medication_key
      const { data: med } = await supabase
        .from('medications')
        .select('id')
        .eq('medication_key', medicationId)
        .single();
      
      if (med) {
        medicationId = med.id;
      } else {
        throw new Error(`Medication not found: ${payload.medication_id}`);
      }
    }
  }

  const { data, error } = await supabase
    .from('med_events')
    .insert({
      user_key: userKey, // Always from session, not payload
      medication_id: medicationId,
      event_time: payload.event_time || new Date().toISOString(),
      event_type: payload.event_type,
      source: payload.source,
      metadata: payload.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Log event error:', error);
    if (isPermissionError(error)) {
      throw new Error('Permission denied. Please sign in again.');
    }
    throw new Error(error.message);
  }

  console.log('✅ Event logged:', data.id);
  return data as MedEvent;
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to medication changes for a user
 */
export function subscribeMedications(
  user_key: string,
  callback: (payload: any) => void
) {
  console.log('🔔 Subscribing to medication changes:', user_key);
  
  return supabase
    .channel(`medications:${user_key}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'medications',
        filter: `user_key=eq.${user_key}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to med event changes for a user
 */
export function subscribeMedEvents(
  user_key: string,
  callback: (payload: any) => void
) {
  console.log('🔔 Subscribing to event changes:', user_key);
  
  return supabase
    .channel(`med_events:${user_key}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'med_events',
        filter: `user_key=eq.${user_key}`,
      },
      callback
    )
    .subscribe();
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function healthCheck(): Promise<{ status: string; supabase: boolean }> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return {
      status: 'healthy',
      supabase: !error,
    };
  } catch {
    return {
      status: 'unhealthy',
      supabase: false,
    };
  }
}
