"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client fallback when the server callback could not exchange the OAuth code
 * (common with PKCE cookie timing). Completes Google sign-in in the browser.
 */
function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState("Finishing Google sign-in…");

  useEffect(() => {
    let alive = true;

    async function run() {
      const code = params.get("code");
      const next = params.get("next") || "/";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

      if (!code) {
        router.replace(`/?auth_error=${encodeURIComponent("Missing Google sign-in code.")}`);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!alive) return;

      if (error) {
        router.replace(
          `/?auth_error=${encodeURIComponent(error.message || "Google sign-in failed. Try again.")}`
        );
        return;
      }

      setStatus("Signed in — opening pi River…");
      router.replace(safeNext);
    }

    void run();
    return () => {
      alive = false;
    };
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm font-bold text-[#9AA0B4]">{status}</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm font-bold text-[#9AA0B4]">Finishing Google sign-in…</p>
        </div>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
