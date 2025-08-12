import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://your-supabase-url.supabase.co',
  'public-anon-key',
);
