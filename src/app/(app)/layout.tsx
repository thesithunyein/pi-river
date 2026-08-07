import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

const DEMO_USER = {
  id: "demo-user",
  email: "player@river.game",
  user_metadata: { full_name: "River Player" },
} as any;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // If Supabase is not configured (or createClient returned null), use demo mode
  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col max-w-[820px] mx-auto bg-gradient-to-b from-river-bg1 to-river-bg border-x border-river-line">
        <TopBar user={DEMO_USER} />
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
        <BottomNav />
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  return (
    <div className="min-h-screen flex flex-col max-w-[820px] mx-auto bg-gradient-to-b from-river-bg1 to-river-bg border-x border-river-line">
      <TopBar user={user} />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
