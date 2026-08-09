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
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithOAuth: async () => ({
          error: {
            message:
              "Google is not configured. Connect a wallet to continue, or add Supabase env keys.",
          },
        }),
        signOut: async () => ({ error: null }),
        exchangeCodeForSession: async () => ({ error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => undefined } },
        }),
      },
      ...emptyRealtimeStub(),
    } as any;
  }

  return createBrowserClient(url!, key);
}

/** No-op Realtime surface when env keys are missing. */
function emptyRealtimeStub() {
  const channel = {
    on() {
      return channel;
    },
    subscribe(cb?: (status: string) => void) {
      cb?.("SUBSCRIBED");
      return channel;
    },
    async track() {
      return "ok";
    },
    async untrack() {
      return "ok";
    },
    async send() {
      return "ok";
    },
    presenceState() {
      return {};
    },
  };
  return {
    channel: () => channel,
    removeChannel: () => undefined,
  };
}

