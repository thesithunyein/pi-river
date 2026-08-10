"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Entry is handled by AuthGate on `/`. Preserve auth errors when redirecting. */
function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const err = params.get("error") || params.get("auth_error");
    if (err) {
      const msg =
        err === "auth_failed"
          ? "Google sign-in failed. Try again, or continue with MetaMask."
          : err;
      router.replace(`/?auth_error=${encodeURIComponent(msg)}`);
      return;
    }
    router.replace("/");
  }, [router, params]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm font-bold text-[#9AA0B4]">Taking you to pi River…</p>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm font-bold text-[#9AA0B4]">Taking you to pi River…</p>
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}
