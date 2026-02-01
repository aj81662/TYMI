import { supabase } from './supabase';
import {
  fetchMedications,
  fetchMedEvents,
  fetchUserProfile,
  subscribeMedications,
  subscribeMedEvents,
} from './BackendService';
import { getCurrentUserKey } from './AuthService';

type UpdateCallback = (table: string, payload: any) => void;

/**
 * Orchestrates initial pulls and realtime listeners for core tables.
 * Tables covered: users/user_profiles (account), medications, med_events (adherence logs).
 */
export async function pullAll(): Promise<{
  profile?: any;
  medications?: any[];
  med_events?: any[];
}> {
  // Ensure authenticated where applicable - underlying functions enforce auth
  const profile = await fetchUserProfile().catch((e) => {
    console.warn('pullAll: fetchUserProfile failed', e?.message || e);
    return undefined;
  });

  const medications = await fetchMedications().catch((e) => {
    console.warn('pullAll: fetchMedications failed', e?.message || e);
    return [];
  });

  const med_events = await fetchMedEvents().catch((e) => {
    console.warn('pullAll: fetchMedEvents failed', e?.message || e);
    return [];
  });

  return { profile, medications, med_events };
}

/**
 * Start realtime subscriptions for the current user. Returns an unsubscribe function.
 * onUpdate will be called with (table, payload) when changes arrive.
 */
export async function startRealtimeListeners(onUpdate: UpdateCallback) {
  const userKey = await getCurrentUserKey();
  if (!userKey) throw new Error('Not authenticated');

  // Use existing BackendService helpers for meds and med_events
  const medsSub = subscribeMedications(userKey, (payload) => onUpdate('medications', payload));
  const eventsSub = subscribeMedEvents(userKey, (payload) => onUpdate('med_events', payload));

  // Subscribe to user_profiles and users (profile/account) changes
  const profilesSub = supabase
    .channel(`user_profiles:${userKey}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_profiles', filter: `user_key=eq.${userKey}` },
      (payload) => onUpdate('user_profiles', payload)
    )
    .subscribe();

  const usersSub = supabase
    .channel(`users:${userKey}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users', filter: `user_key=eq.${userKey}` },
      (payload) => onUpdate('users', payload)
    )
    .subscribe();

  const subs = [medsSub, eventsSub, profilesSub, usersSub];

  return async function stop() {
    try {
      for (const s of subs) {
        if (!s) continue;
        // subscription returned by .subscribe() has an unsubscribe() method
        try { await s.unsubscribe(); } catch { try { s.unsubscribe(); } catch {} }
      }
    } catch (err) {
      console.warn('Error unsubscribing realtime listeners', err);
    }
  };
}

/**
 * Quick test helper: pulls current data and starts listeners that log events.
 * Returns an object with the stop() function to cancel listeners.
 */
export async function testSync() {
  const data = await pullAll();
  console.log('SyncService.testSync: initial pull', data);

  const stop = await startRealtimeListeners((table, payload) => {
    console.log('Realtime update', table, payload);
  });

  return { stop };
}

export default {
  pullAll,
  startRealtimeListeners,
  testSync,
};
