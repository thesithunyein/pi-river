"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const initials = user.user_metadata?.full_name
    ?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    || user.email?.slice(0, 2).toUpperCase()
    || "U";

  async function signOut() {
    if (!isDemo) await supabase.auth.signOut();
    router.push("/auth/signin");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-river-line glass">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-river-cyan to-blue-600 flex items-center justify-center glow-cyan">
          <span className="text-white font-display font-bold text-sm">R</span>
        </div>
        <span className="font-display font-bold text-lg tracking-wide">RIVER</span>
      </div>

      {/* Balance */}
      <div className="ml-auto flex items-center gap-2">
        <div className="bg-river-bg3 border border-river-line rounded-full px-3 py-1.5 flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-river-bg2 flex items-center justify-center">
            <svg className="w-3 h-3 text-river-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M16 12h2"/></svg>
          </div>
          <div>
            <div className="text-[9px] text-river-grey uppercase tracking-widest font-semibold">Balance</div>
            <div className="font-display font-bold text-sm leading-none">2,450,000</div>
          </div>
        </div>
        <button className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-base flex items-center justify-center glow-cyan">+</button>
      </div>

      {/* User avatar + sign out */}
      <button onClick={signOut} className="w-8 h-8 rounded-full bg-gradient-to-br from-river-cyan to-river-violet flex items-center justify-center text-xs font-bold text-river-bg" title="Sign out">
        {initials}
      </button>
    </div>
  );
}
