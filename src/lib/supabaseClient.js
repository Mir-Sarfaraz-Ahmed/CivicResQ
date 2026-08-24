import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://aszzhmjdmsnkvqbrznve.supabase.co';
const defaultSupabaseKey = 'sb_publishable_A0X7-olXJKBkV3uUBHloAg_eKOJCRmq';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseKey;

// Supabase is permanently configured with live cloud instance
export const isSupabaseConfigured = true;

// Instantiate live Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
