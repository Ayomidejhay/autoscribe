import { createClient, SupabaseClient } from "@supabase/supabase-js";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const SUPABASE_CREDS_STORAGE_KEY = "autoscribe_supabase_runtime_creds";

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";

export function getSupabaseCredentials(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
} {
  const envValid =
    Boolean(envUrl) &&
    Boolean(envAnonKey) &&
    !envUrl.includes("your-project-id") &&
    !envAnonKey.includes("your-supabase");

  if (envValid) {
    return { url: envUrl, anonKey: envAnonKey, isConfigured: true };
  }

  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(SUPABASE_CREDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { url?: string; anonKey?: string };
        if (
          parsed.url &&
          parsed.anonKey &&
          parsed.url.startsWith("https://")
        ) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim(),
            isConfigured: true,
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  return { url: "", anonKey: "", isConfigured: false };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  if (cachedClient && cachedUrl === url) {
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  cachedUrl = url;
  return cachedClient;
}

export function saveRuntimeSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SUPABASE_CREDS_STORAGE_KEY,
    JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
  );
  cachedClient = null;
  cachedUrl = "";
}

export const isSupabaseConfigured =
  Boolean(envUrl) &&
  Boolean(envAnonKey) &&
  !envUrl.includes("your-project-id") &&
  !envAnonKey.includes("your-supabase");

export const supabase = isSupabaseConfigured
  ? createClient(envUrl, envAnonKey)
  : null;
