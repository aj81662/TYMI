import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchMedications, subscribeMedications } from '../lib/backendService';
import type { BackendMedication } from '../lib/supabase.types';

export function useMedications() {
  const [medications, setMedications] = useState<BackendMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let channel: any = null;

    async function setup() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const userKey = user.id;
        const meds = await fetchMedications(userKey);
        setMedications(meds);

        channel = subscribeMedications(userKey, async () => {
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
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { medications, loading, error };
}
