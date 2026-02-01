/**
 * Auth Service - Centralized authentication and session management
 * 
 * ============================================================================
 * SECURITY MODEL
 * ============================================================================
 * 
 * This service provides a single source of truth for the authenticated user's
 * identity. It derives user_key from the active Supabase session, never from
 * cached storage.
 * 
 * Key Principles:
 * 1. NEVER cache user_key in SecureStore or AsyncStorage
 * 2. ALWAYS derive user identity from supabase.auth.getSession()
 * 3. user_key === session.user.id (Supabase auth.uid())
 * 4. On auth state changes, clear all cached data and resubscribe to Realtime
 * 
 * This ensures:
 * - No drift between cached user_key and actual session
 * - Logout/login switches identity correctly
 * - RLS policies (which use auth.uid()) always match client state
 * 
 * ============================================================================
 * TWO-USER CONTAMINATION TEST CHECKLIST
 * ============================================================================
 * 
 * Run this manual test after any auth/storage changes:
 * 
 * 1. [ ] Login as User A
 * 2. [ ] Create a medication (verify it appears in list)
 * 3. [ ] Create a med_event (log a dose)
 * 4. [ ] Edit profile (set name, etc.)
 * 5. [ ] Verify Realtime updates work (medication list updates without refresh)
 * 
 * 6. [ ] Sign out via Settings (NOT by clearing app data)
 * 7. [ ] Verify navigation resets to Login screen
 * 8. [ ] **CRITICAL**: Verify medication list shows empty/loading, NOT User A's data
 * 
 * 9. [ ] Login as User B (different account)
 * 10. [ ] **CRITICAL**: Verify User A's medications do NOT appear (even briefly)
 * 11. [ ] **CRITICAL**: Verify Edit Profile shows empty or User B's data, NOT User A's
 * 12. [ ] Create medication as User B (verify it appears)
 * 
 * 13. [ ] Attempt cross-user attack: As User B, try to log event for User A's medication_id
 *     - Expected: RLS should reject with permission error
 * 
 * 14. [ ] Logout User B, login User A again
 * 15. [ ] Verify only User A's medications appear (not User B's)
 * 
 * If any step fails, check:
 * - handleSignOut() clears all AsyncStorage keys
 * - AppDataContext clears state on SIGNED_OUT event
 * - Screens fetch from BackendService, not AsyncStorage
 * - No cached profile data in AsyncStorage
 * ============================================================================
 */

import { supabase } from './supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { unsubscribeAll } from './RealtimeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type for auth state change callbacks
type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;

// Registered callbacks for auth state changes
const authStateCallbacks: Set<AuthStateCallback> = new Set();

// Track if the auth listener has been initialized
let authListenerInitialized = false;

/**
 * Get the current authenticated user's ID (user_key).
 * This is the ONLY way to get user_key - derived from session, never cached.
 * 
 * @returns The user's UUID from Supabase Auth, or null if not authenticated
 */
export async function getCurrentUserKey(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error getting session:', error.message);
      return null;
    }
    
    return session?.user?.id ?? null;
  } catch (error) {
    console.error('❌ Exception getting session:', error);
    return null;
  }
}

/**
 * Get the current authenticated user's ID, throwing if not authenticated.
 * Use this when authentication is required.
 * 
 * @throws Error if user is not authenticated
 */
export async function requireUserKey(): Promise<string> {
  const userKey = await getCurrentUserKey();
  
  if (!userKey) {
    throw new AuthRequiredError('User is not authenticated');
  }
  
  return userKey;
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.user !== null;
}

/**
 * Custom error for auth-required operations
 */
export class AuthRequiredError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

/**
 * Initialize the auth state change listener.
 * Call this once at app startup (e.g., in App.tsx or root component).
 * 
 * This listener handles:
 * - Clearing cached data on logout
 * - Unsubscribing from Realtime channels
 * - Notifying registered callbacks
 */
export function initializeAuthListener(): () => void {
  if (authListenerInitialized) {
    console.warn('⚠️ Auth listener already initialized');
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id ?? 'no user');

      switch (event) {
        case 'SIGNED_OUT':
          await handleSignOut();
          break;
          
        case 'SIGNED_IN':
          // New user signed in - existing subscriptions should be refreshed
          // Callbacks will handle this
          break;
          
        case 'TOKEN_REFRESHED':
          // Token refreshed - session is still valid, no action needed
          break;
          
        case 'USER_UPDATED':
          // User profile updated
          break;
      }

      // Notify all registered callbacks
      authStateCallbacks.forEach(callback => {
        try {
          callback(event, session);
        } catch (error) {
          console.error('Error in auth state callback:', error);
        }
      });
    }
  );

  authListenerInitialized = true;

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
    authListenerInitialized = false;
  };
}

/**
 * Register a callback for auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback: AuthStateCallback): () => void {
  authStateCallbacks.add(callback);
  return () => authStateCallbacks.delete(callback);
}

/**
 * Handle sign out - clear all cached data and subscriptions
 */
async function handleSignOut(): Promise<void> {
  console.log('🧹 Cleaning up after sign out...');

  try {
    // 1. Unsubscribe from all Realtime channels
    await unsubscribeAll();
    console.log('✅ Unsubscribed from Realtime channels');

    // 2. Clear ALL user-scoped AsyncStorage data
    // This includes auth state, profile data, cached medications, etc.
    // NOTE: If any of these keys contain sensitive data, it indicates
    // a security issue in legacy code that should be investigated.
    const keysToRemove = [
      // Auth state flags (non-sensitive, but should be cleared)
      'isLoggedIn',
      'authMethod',
      
      // Profile data - these are now fetched from backend, not cached
      // Keeping for backwards compatibility cleanup
      'first_name',
      'last_name',
      'email',
      'nickname',
      'age',
      'gender',
      'display_name',
      // SECURITY: Password should NEVER be in AsyncStorage!
      // If this key exists, it's from insecure legacy code.
      // We remove it here as a safety measure.
      'password',
      
      // Storage keys from StorageService
      '@medications',
      '@adherence_records',
      '@user_preferences',
      '@user_settings',
      '@patient_names',
      '@profile_data',
      '@current_user_id',
      '@user_lookup',
      '@localUserProfile',
      '@events',
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('✅ Cleared AsyncStorage user data');

    // Note: SecureStore tokens are managed by Supabase Auth adapter
    // They will be cleared automatically on sign out

  } catch (error) {
    console.error('❌ Error during sign out cleanup:', error);
  }
}

/**
 * Sign out the current user.
 * This will trigger the auth state change listener.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Check if an error is an RLS/permission error
 */
export function isPermissionError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() ?? '';
  const code = error.code ?? '';
  
  return (
    code === '42501' || // PostgreSQL insufficient privilege
    code === 'PGRST301' || // PostgREST JWT error
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('rls') ||
    message.includes('policy')
  );
}

/**
 * Check if an error is an auth/session error
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() ?? '';
  const code = error.code ?? '';
  
  return (
    code === 'PGRST301' ||
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('session') ||
    message.includes('not authenticated') ||
    message.includes('unauthorized')
  );
}
