# MedBuddy Web Developer Handoff Document

> **Project:** MedBuddy - Medication Adherence App  
> **Date:** January 23, 2026  
> **Purpose:** Enable website to sync with existing mobile app via shared Supabase backend

---

## 1. Supabase Credentials

```
Project URL:  https://sxucfwshtvskoqvisbeu.supabase.co
Anon Key:     sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K
Project ID:   sxucfwshtvskoqvisbeu
```

> ⚠️ **Security Note:** The anon key is safe to use in frontend code. It's a public/publishable key. Never request or use the `service_role` key - that bypasses security.

---

## 2. Quick Start

### Install Dependencies
```bash
npm install @supabase/supabase-js
npm install supabase --save-dev  # For type generation
```

### Initialize Supabase Client
```typescript
// src/lib/supabase.ts
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
```

---

## 3. Auto-Generate TypeScript Types (IMPORTANT)

When the database schema changes, regenerate types to keep your code in sync.

### Add to package.json
```json
{
  "scripts": {
    "generate-types": "npx supabase gen types typescript --project-id sxucfwshtvskoqvisbeu --schema public > src/lib/supabase.types.ts"
  }
}
```

### Usage
```bash
# Login once
npx supabase login

# Run whenever database schema changes
npm run generate-types
```

### Workflow
```
Database schema modified (by me)
        ↓
I notify you: "Schema updated, regenerate types"
        ↓
You run: npm run generate-types
        ↓
TypeScript types auto-updated in your project
        ↓
IDE shows new columns, catches type errors
```

---

## 4. Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | User accounts (linked to Supabase Auth) |
| `user_profiles` | Extended profile info (nickname, age, gender) |
| `medications` | Medication records |
| `med_events` | Adherence/dose logging |
| `user_settings` | User preferences |

### `users` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment ID |
| `user_key` | TEXT | **Primary identifier** - Supabase Auth UUID |
| `email` | TEXT | User email |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `display_name` | TEXT | Display name |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last update time |

### `user_profiles` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment ID |
| `user_key` | TEXT | FK to users.user_key |
| `nickname` | TEXT | User nickname |
| `age` | INT | User age |
| `gender` | TEXT | User gender |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

### `medications` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment ID |
| `user_key` | TEXT | FK to users.user_key |
| `medication_key` | TEXT | Unique medication identifier |
| `drug_name` | TEXT | Name of medication |
| `strength` | TEXT | Dosage strength (e.g., "10mg") |
| `route` | TEXT | Administration route |
| `instruction` | TEXT | Dosage instructions |
| `frequency_text` | TEXT | Frequency (e.g., "twice daily") |
| `qty_text` | TEXT | Quantity dispensed |
| `refills_text` | TEXT | Refills remaining |
| `is_active` | BOOLEAN | **Soft delete flag** (false = deleted) |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

### `med_events` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment ID |
| `user_key` | TEXT | FK to users.user_key |
| `medication_id` | INT | FK to medications.id |
| `event_time` | TIMESTAMP | When event occurred |
| `event_type` | TEXT | "taken", "missed", "skipped", "reminder" |
| `source` | TEXT | "manual", "rfid", "notification" |
| `metadata` | JSONB | Additional event data |
| `created_at` | TIMESTAMP | Creation time |

### `user_settings` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment ID |
| `user_key` | TEXT | FK to users.user_key |
| `confirmation_window_minutes` | INT | Time window for dose confirmation |
| `use_rfid_confirmation` | BOOLEAN | RFID confirmation enabled |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

---

## 5. Mobile App Code Reference

Below is the **actual code from our mobile app**. You can use the same patterns for the website.

### TypeScript Interfaces (from our BackendService.ts)

```typescript
// ============================================================================
// TYPES - Use these exact interfaces for compatibility
// ============================================================================

export interface SignupRequest {
  email?: string;
  display_name?: string;
  user_key: string;
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

export interface MedicationCreate {
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

export interface MedEventCreate {
  user_key: string;
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
```

---

## 6. Authentication Code (Exact Mobile App Implementation)

### Helper Functions

```typescript
/**
 * Generate a unique medication key
 */
function generateMedicationKey(): string {
  return `med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current authenticated user's ID (from Supabase Auth)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
```

### Sign Up (Exact Code)

```typescript
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

  // Use Auth user ID as user_key for consistency
  const userKey = authData.user.id;

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
```

### Login (Exact Code)

```typescript
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
```

### Sign Out (Exact Code)

```typescript
export async function signOutUser(): Promise<void> {
  console.log('🔐 Supabase Auth signOut');
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ Sign out error:', error);
    throw new Error(error.message);
  }
  console.log('✅ Signed out');
}
```

---

## 7. User Profile Code (Exact Mobile App Implementation)

### Update User Profile

```typescript
export async function updateUserProfile(payload: Partial<UserProfile> & { user_key: string }): Promise<UserProfile> {
  console.log('📝 Supabase updateUserProfile:', payload.user_key);

  // Update users table with basic info
  const { error: userError } = await supabase
    .from('users')
    .update({
      email: payload.email,
      display_name: payload.display_name,
      first_name: payload.first_name,
      last_name: payload.last_name,
      updated_at: new Date().toISOString(),
    })
    .eq('user_key', payload.user_key);

  if (userError) {
    console.error('❌ Update user error:', userError);
    throw new Error(userError.message);
  }

  // Upsert user_profiles for extended info
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_key: payload.user_key,
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
```

### Fetch User Profile

```typescript
export async function fetchUserProfile(user_key: string): Promise<UserProfile> {
  console.log('📖 Supabase fetchUserProfile:', user_key);

  // Fetch user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('user_key', user_key)
    .single();

  if (userError) {
    console.error('❌ Fetch user error:', userError);
    throw new Error(userError.message);
  }

  // Fetch profile data
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_key', user_key)
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
```

---

## 8. Medication CRUD Code (Exact Mobile App Implementation)

### Fetch Medications

```typescript
export async function fetchMedications(user_key: string): Promise<BackendMedication[]> {
  console.log('💊 Supabase fetchMedications:', user_key);

  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_key', user_key)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Fetch medications error:', error);
    throw new Error(error.message);
  }

  console.log(`✅ Fetched ${data?.length || 0} medications`);
  return (data || []) as BackendMedication[];
}
```

### Create Medication

```typescript
export async function createMedication(payload: MedicationCreate): Promise<BackendMedication> {
  console.log('💊 Supabase createMedication:', payload.drug_name);

  // Check if user is authenticated with Supabase
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔐 Supabase session:', session ? `Authenticated as ${session.user.id}` : 'NOT AUTHENTICATED');
  
  if (!session) {
    console.warn('⚠️ No Supabase auth session - user may be using legacy account');
  }

  // Generate medication_key if not provided
  const medicationKey = payload.medication_key || generateMedicationKey();

  const { data, error } = await supabase
    .from('medications')
    .insert({
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
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Create medication error:', error);
    throw new Error(error.message);
  }

  console.log('✅ Medication created:', data.id);
  return data as BackendMedication;
}
```

### Update Medication

```typescript
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
```

### Delete Medication (Soft Delete)

```typescript
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
```

---

## 9. Adherence Events Code (Exact Mobile App Implementation)

### Fetch Events

```typescript
export async function fetchMedEvents(user_key: string): Promise<MedEvent[]> {
  console.log('📊 Supabase fetchMedEvents:', user_key);

  const { data, error } = await supabase
    .from('med_events')
    .select('*')
    .eq('user_key', user_key)
    .order('event_time', { ascending: false });

  if (error) {
    console.error('❌ Fetch events error:', error);
    throw new Error(error.message);
  }

  console.log(`✅ Fetched ${data?.length || 0} events`);
  return (data || []) as MedEvent[];
}
```

### Log Adherence Event

```typescript
export async function logMedEvent(payload: MedEventCreate): Promise<MedEvent> {
  console.log('📊 Supabase logMedEvent:', payload.event_type);

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
      user_key: payload.user_key,
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
    throw new Error(error.message);
  }

  console.log('✅ Event logged:', data.id);
  return data as MedEvent;
}
```

---

## 10. Real-Time Sync Code (Exact Mobile App Implementation)

This is **critical** - it enables instant updates between mobile app and website.

### Subscribe to Medication Changes

```typescript
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
```

### Subscribe to Event Changes

```typescript
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
```

### Health Check

```typescript
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
```

---

## 11. React Hook Example (For Website)

```typescript
// src/hooks/useMedications.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchMedications, subscribeMedications } from '../lib/backendService';
import type { BackendMedication } from '../lib/backendService';

export function useMedications() {
  const [medications, setMedications] = useState<BackendMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof subscribeMedications> | null = null;

    async function setup() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const userKey = user.id;

        // Initial fetch
        const meds = await fetchMedications(userKey);
        setMedications(meds);

        // Subscribe to changes (real-time sync with mobile app)
        channel = subscribeMedications(userKey, async () => {
          // Refetch on any change
          const updated = await fetchMedications(userKey);
          setMedications(updated);
        });

      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { medications, loading, error };
}
```

---

## 12. Setup Required (Action Needed)

### From You (Web Developer)
Please send me your production website URL so I can add it to the Supabase authentication whitelist.

For example:
- `https://medbuddy.yourcompany.com`
- `https://your-domain.com`

Also send any development URLs:
- `http://localhost:3000`
- `http://localhost:5173` (if using Vite)

### What I Will Configure
Once you send the URLs, I will add them to:
- Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

---

## 13. Security Notes

| ✅ Safe | ❌ Never Do |
|---------|-------------|
| Use anon key in frontend | Request or use service_role key |
| Query with `user_key` filter | Query without user filter |
| Use soft delete (`is_active=false`) | Hard delete user data |
| Store JWT in localStorage/cookies | Store passwords locally |
| Trust Supabase for password hashing | Implement own password storage |

### Row-Level Security (RLS)
The database has RLS enabled. Users can only access rows where `user_key` matches their authenticated user ID. You don't need to implement access control - just always include the `user_key` filter in queries.

---

## 14. Testing Checklist

| Test | Expected Result |
|------|-----------------|
| Sign up on website | User can log into mobile app with same credentials |
| Sign in on website | Sees all medications from mobile app |
| Add medication on website | Appears on mobile app within 5 seconds |
| Add medication on mobile | Appears on website within 5 seconds |
| Delete medication on website | Disappears from mobile app |
| Log dose on website | Appears in mobile app history |

---

## 15. File Structure Suggestion

```
src/
├── lib/
│   ├── supabase.ts           # Supabase client init
│   ├── supabase.types.ts     # Auto-generated types (npm run generate-types)
│   └── backendService.ts     # Copy functions from sections 6-10
├── hooks/
│   ├── useMedications.ts     # React hook for medications
│   ├── useAuth.ts            # React hook for auth state
│   └── useProfile.ts         # React hook for user profile
└── components/
    └── ...
```

---

## 16. Contact

If you have questions about the database schema or authentication flow, please reach out.

**Files You Can Reference:**
- Mobile app source: `src/services/BackendService.ts` (all code above comes from here)
- TypeScript types: `src/config/supabase.types.ts`
- Database schema: `docs/database_schema_flow.md`

---

*Document generated: January 23, 2026*
*Last updated: January 23, 2026 - Added type generation workflow and actual mobile app code*
