// src/services/supabase.ts
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

const SUPABASE_URL = (Config.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (Config.SUPABASE_ANON_KEY ?? '').trim();
export const SUPABASE_BUCKET = Config.SUPABASE_BUCKET ?? 'deepforestpoc';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing env. URL or anon key is empty.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Lazy, idempotent sign-in using env creds (dev-only pattern).
let inflight: Promise<boolean> | null = null;

export async function ensureSignedIn(): Promise<boolean> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // Already signed in?
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) return true;

      const email = (Config.SUPABASE_USER ?? '').trim();
      const password = (Config.SUPABASE_PASSWORD ?? '').trim();
      if (!email || !password) {
        console.warn('[Supabase] No SUPABASE_USER/PASSWORD set; skipping auto sign-in.');
        return false;
      }

      const { data: s, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) {
        console.warn('[Supabase] Auto sign-in failed:', e.message);
        return false;
      }
      console.log('[Supabase] Authenticated as', s.user?.email);
      return true;
    } catch (err) {
      console.warn('[Supabase] ensureSignedIn error:', err);
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
