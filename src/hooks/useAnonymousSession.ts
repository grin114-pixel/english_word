import { useEffect, useState } from 'react';
import { ensureAnonymousSession, isSupabaseConfigured } from '../lib/supabase';

interface SessionState {
  ready: boolean;
  error: string | null;
}

export function useAnonymousSession(): SessionState {
  const [state, setState] = useState<SessionState>({ ready: false, error: null });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ ready: false, error: 'not-configured' });
      return;
    }

    let cancelled = false;
    ensureAnonymousSession()
      .then(() => {
        if (!cancelled) setState({ ready: true, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ ready: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
