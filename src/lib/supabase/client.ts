"use client";

import { createBrowserClient } from "@supabase/ssr";

function isValidUrl(urlString?: string) {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidUrl(url) || !key) {
    // Return a stub that doesn't crash: auth operations will fail gracefully
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithOAuth: async () => ({
          error: {
            message:
              "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.",
          },
        }),
        signOut: async () => ({ error: null }),
        exchangeCodeForSession: async () => ({ error: null }),
      },
    } as any;
  }

  return createBrowserClient(url!, key);
}

