import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  publicAppUrl: string;
  isConfigured: boolean;
}

/**
 * Read and validate environment variables at startup
 */
export function getAppConfig(): AppConfig {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const supabasePublishableKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  let publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  if (!publicAppUrl && typeof window !== 'undefined') {
    publicAppUrl = window.location.origin;
  }
  if (!publicAppUrl) {
    publicAppUrl = 'http://localhost:5173';
  }

  // Check validity of Supabase credentials
  const isUrlValid = Boolean(supabaseUrl && (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://')));
  const isKeyValid = Boolean(supabasePublishableKey && supabasePublishableKey.length > 10);
  const isConfigured = Boolean(isUrlValid && isKeyValid);

  return {
    supabaseUrl,
    supabasePublishableKey,
    publicAppUrl,
    isConfigured,
  };
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns singleton Supabase client or null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getAppConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      realtime: {
        params: {
          eventsPerSecond: 40,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}
