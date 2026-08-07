import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { GameProvider } from "@/context/GameContext";

const GUEST_USER = {
  id: "guest-user",
  email: "guest@river.poker",
  user_metadata: { full_name: "Guest Player" },
} as any;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isGuestMode = cookieStore.get("river_guest_mode")?.value === "true";

  const supabase = await createClient();

  // If Supabase is not configured or user clicked Continue with Guest
  if (!supabase || isGuestMode) {
    return (
      <GameProvider>
        <div className="min-h-screen flex flex-col max-w-[960px] mx-auto bg-gradient-to-b from-river-bg1 to-river-bg border-x border-river-line shadow-2xl relative">
          <TopBar user={GUEST_USER} />
          <main className="flex-1 overflow-y-auto pb-20">{children}</main>
          <BottomNav />
        </div>
      </GameProvider>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <GameProvider>
      <div className="min-h-screen flex flex-col max-w-[960px] mx-auto bg-gradient-to-b from-river-bg1 to-river-bg border-x border-river-line shadow-2xl relative">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
        <BottomNav />
      </div>
    </GameProvider>
  );
}
