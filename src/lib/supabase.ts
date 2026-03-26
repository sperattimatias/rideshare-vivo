import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getClientEnv } from './env';

const { supabaseUrl, supabaseAnonKey } = getClientEnv();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
