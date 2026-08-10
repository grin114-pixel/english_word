import { isSupabaseConfigured } from '../lib/supabase';

interface ReadyState {
  ready: boolean;
  error: string | null;
}

export function useSupabaseReady(): ReadyState {
  if (!isSupabaseConfigured) {
    return { ready: false, error: 'not-configured' };
  }

  return { ready: true, error: null };
}
