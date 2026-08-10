"use client";

import { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { ChallengeInviteListener } from "@/components/ChallengeInviteListener";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm font-bold text-[#9AA0B4]">Loading pi River…</p>
        </div>
      }
    >
      <AuthGate>
        <div className="relative min-h-screen overflow-x-hidden text-white">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 75% 48% at 50% -8%, rgba(245,197,24,0.2), transparent 55%), radial-gradient(ellipse 48% 36% at 100% 22%, rgba(46,160,100,0.12), transparent 52%), radial-gradient(ellipse 44% 34% at 0% 82%, rgba(46,160,100,0.14), transparent 48%), linear-gradient(180deg, #0B0A14 0%, #100e1a 45%, #0B0A14 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #fff 0 0.6px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0 0.6px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          <TopBar />
          <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-lg flex-col px-4 pb-32 pt-4 sm:max-w-5xl sm:px-6 sm:pt-5 lg:max-w-6xl">
            <ChallengeInviteListener />
            {children}
          </main>
          <BottomNav />
        </div>
      </AuthGate>
    </Suspense>
  );
}
