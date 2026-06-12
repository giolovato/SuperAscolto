import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Mancano le variabili d\'ambiente di Supabase nel file .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);