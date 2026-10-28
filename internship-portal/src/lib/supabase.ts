import { createClient } from '@supabase/supabase-js';

// Public values: the project URL and publishable key are meant to ship to the
// browser; every table is protected by row level security. Env vars win when
// present (Vercel's Supabase integration sets the NEXT_PUBLIC_* pair).
const env = import.meta.env;

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvogrxgqddabtckoinbo.supabase.co';

export const SUPABASE_KEY: string =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_xpsUJb93dkhJXtA0SG2uDA_PUArU30f';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'yi-drive-auth' },
});
