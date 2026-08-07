"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Entry is handled by AuthGate on `/`. Keep this route as a redirect. */
export default function SignIn() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm font-bold text-[#9AA0B4]">Taking you to pi River…</p>
    </div>
  );
}
