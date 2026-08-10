import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);

let anonymousSignInPromise: Promise<void> | null = null;

/**
 * 로그인 화면 없이도 Supabase RLS로 기기별 데이터를 분리하기 위해
 * 익명 인증(Anonymous Sign-in) 세션을 보장한다.
 * 세션은 Supabase 클라이언트가 localStorage에 자동으로 유지한다.
 */
export function ensureAnonymousSession(): Promise<void> {
  if (!isSupabaseConfigured) {
    return Promise.reject(new Error('Supabase 환경변수가 설정되지 않았습니다.'));
  }

  if (anonymousSignInPromise) {
    return anonymousSignInPromise;
  }

  anonymousSignInPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return;
    }
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      anonymousSignInPromise = null;
      throw error;
    }
  })();

  return anonymousSignInPromise;
}
