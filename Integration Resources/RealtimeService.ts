/**
 * Simple Realtime subscription registry used by the Integration Resources code.
 * Tracks active subscriptions and provides a helper to unsubscribe them all.
 */

const activeSubscriptions = new Set<any>();

export function registerSubscription(sub: any) {
  if (!sub) return sub;
  activeSubscriptions.add(sub);
  return sub;
}

export function removeSubscription(sub: any) {
  if (!sub) return;
  activeSubscriptions.delete(sub);
}

export async function unsubscribeAll(): Promise<void> {
  const subs = Array.from(activeSubscriptions);
  for (const s of subs) {
    try {
      // Supabase realtime channel subscription has an `unsubscribe()` method
      if (typeof s.unsubscribe === 'function') {
        // Some unsubscribe implementations return a promise, await if so
        const res = s.unsubscribe();
        if (res && typeof (res as any).then === 'function') {
          await res;
        }
      } else if (typeof s === 'function') {
        // Allow callbacks/unsubscribe functions
        const res = s();
        if (res && typeof (res as any).then === 'function') {
          await res;
        }
      }
    } catch (error) {
      console.warn('RealtimeService.unsubscribeAll error unsubscribing one subscription:', error);
    } finally {
      activeSubscriptions.delete(s);
    }
  }
}
