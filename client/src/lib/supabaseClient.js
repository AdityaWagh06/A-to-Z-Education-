import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Singleton Supabase client with proper session persistence and multi-tab support
 * 
 * Configuration:
 * - persistSession: true - Persists session across page refreshes
 * - autoRefreshToken: true - Automatically refreshes expired tokens
 * - detectSessionInUrl: true - Detects OAuth callbacks in URL
 * - db.schema: 'public' - Explicitly set schema for real-time subscriptions
 */
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Use 'localStorage' as the storage type for better cross-tab sync
        storageKey: 'sb-auth-token',
      },
      db: {
        schema: 'public',
      },
      global: {
        // Add a longer timeout for slow connections
        headers: {
          'X-Client-Info': 'supabase-js-web',
        },
      },
      // Enable real-time support
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
