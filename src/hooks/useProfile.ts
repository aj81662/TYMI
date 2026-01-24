import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchUserProfile } from '../lib/backendService';
import type { UserProfile } from '../lib/supabase.types';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const p = await fetchUserProfile(user.id);
        if (!mounted) return;
        setProfile(p);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, []);

  return { profile, loading, error };
}
